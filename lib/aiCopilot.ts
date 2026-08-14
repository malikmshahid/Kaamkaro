import Anthropic from "@anthropic-ai/sdk";

/**
 * AI Task Copilot
 * ----------------
 * Turns a rough, one-line idea from a client into a polished, professional
 * task listing: title, full description, category, a fair PKR budget range,
 * and a realistic delivery window — tuned for the Pakistani freelance market.
 *
 * This is the core "AI-native" differentiator: instead of a blank form,
 * every client gets an AI copilot that writes and prices the task for them.
 *
 * Requires ANTHROPIC_API_KEY. If missing, throws so the caller can fall back
 * to the plain manual form.
 */

export type TaskCopilotResult = {
  title: string;
  description: string;
  category: "delivery" | "design" | "coding" | "writing" | "home" | "verification" | "other";
  suggestedBudgetPkr: number;
  budgetRangeLow: number;
  budgetRangeHigh: number;
  deliveryDays: number;
  reasoning: string;
};

const SYSTEM_PROMPT = `You are the task-drafting copilot for KaamKaro, a Pakistani freelance/task marketplace (like a mix of Fiverr and Upwork, localized for Pakistan).

A client will give you a short, rough, possibly Roman Urdu or mixed-language description of something they need done. Your job:
1. Write a clear, professional task TITLE (under 12 words).
2. Write a full task DESCRIPTION (3-6 sentences) that a freelancer could act on without follow-up questions — infer reasonable specifics where the client was vague, and note assumptions briefly.
3. Pick the single best CATEGORY from: delivery, design, coding, writing, home, verification, other.
4. Suggest a FAIR budget in PKR for the Pakistani market for this kind of work (not global/US rates), plus a low-high range.
5. Suggest a realistic delivery window in days.
6. Give a one-sentence REASONING for the budget.

Respond with ONLY a raw JSON object, no markdown fences, no preamble, matching exactly this shape:
{"title": "...", "description": "...", "category": "...", "suggestedBudgetPkr": 0, "budgetRangeLow": 0, "budgetRangeHigh": 0, "deliveryDays": 0, "reasoning": "..."}`;

export async function draftTaskFromIdea(
  idea: string,
  city?: string
): Promise<TaskCopilotResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("AI Copilot is not configured (ANTHROPIC_API_KEY not set).");
  }

  const anthropic = new Anthropic({ apiKey });

  const userMessage = city
    ? `Idea: "${idea}"\nCity: ${city}`
    : `Idea: "${idea}"`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI Copilot returned no text.");
  }

  const cleaned = textBlock.text.replace(/```json|```/g, "").trim();

  let parsed: TaskCopilotResult;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI Copilot returned an unexpected format. Please try again.");
  }

  const validCategories = [
    "delivery",
    "design",
    "coding",
    "writing",
    "home",
    "verification",
    "other",
  ];
  if (!validCategories.includes(parsed.category)) {
    parsed.category = "other";
  }

  return parsed;
}
