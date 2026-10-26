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
 * Uses Groq (OpenAI-compatible chat completions API — very fast, cheap
 * inference for open models). Requires GROQ_API_KEY. If missing, throws so
 * the caller can fall back to the plain manual form.
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
  /** Karachi / Lahore / Islamabad … inferred from the idea. "" when unclear. */
  city: string;
};

/** Cities the marketplace actually serves; anything else falls back to "". */
export const PK_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Hyderabad",
  "Gujranwala",
  "Sialkot",
  "Bahawalpur",
];

const SYSTEM_PROMPT = `You are the task-drafting copilot for KaamKaro, a Pakistani freelance/task marketplace (like a mix of Fiverr and Upwork, localized for Pakistan).

A client will give you a short, rough, possibly Roman Urdu or mixed-language description of something they need done. Your job:
1. Write a clear, professional task TITLE (under 12 words).
2. Write a full task DESCRIPTION (3-6 sentences) that a freelancer could act on without follow-up questions — infer reasonable specifics where the client was vague, and note assumptions briefly.
3. Pick the single best CATEGORY from: delivery, design, coding, writing, home, verification, other.
4. Suggest a FAIR budget in PKR for the Pakistani market for this kind of work (not global/US rates), plus a low-high range.
5. Suggest a realistic delivery window in days.
6. Give a one-sentence REASONING for the budget.
7. Pick the CITY the job is in, from: Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad, Multan, Peshawar, Quetta, Hyderabad, Gujranwala, Sialkot, Bahawalpur. If the client did not say and it cannot be inferred, use an empty string.

Respond with ONLY a raw JSON object, no markdown fences, no preamble, matching exactly this shape:
{"title": "...", "description": "...", "category": "...", "suggestedBudgetPkr": 0, "budgetRangeLow": 0, "budgetRangeHigh": 0, "deliveryDays": 0, "reasoning": "...", "city": "..."}`;

export async function draftTaskFromIdea(
  idea: string,
  city?: string
): Promise<TaskCopilotResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("AI Copilot is not configured (GROQ_API_KEY not set).");
  }

  const userMessage = city ? `Idea: "${idea}"\nCity: ${city}` : `Idea: "${idea}"`;

  // Groq retired llama-3.3-70b-versatile on 16 Aug 2026 (it now returns 404
  // model_not_found). Model is env-driven so it never needs a code change
  // again: set GROQ_MODEL in Vercel. The fallbacks are Groq's own recommended
  // replacements, tried in order if the configured one is missing.
  const candidates = [
    process.env.GROQ_MODEL,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
  ].filter((m): m is string => Boolean(m));

  let res: Response | null = null;
  let lastError = "";

  for (const model of candidates) {
    const attempt = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (attempt.ok) {
      res = attempt;
      break;
    }

    lastError = `${attempt.status} ${(await attempt.text().catch(() => "")).slice(0, 200)}`;
    // Only try the next model when this one doesn't exist / isn't accessible.
    // Any other error (rate limit, bad key) would fail the same way again.
    if (attempt.status !== 404) break;
  }

  if (!res) {
    // Details go to the server log only — never to the browser.
    console.error("AI Copilot provider error:", lastError);
    throw new Error("AI Copilot is temporarily unavailable. Please fill the form manually.");
  }

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("AI Copilot returned an empty draft. Please try again or fill the form manually.");
  }

  const cleaned = text.replace(/```json|```/g, "").trim();

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

  // The AI fills the city the client forgot — QA flagged that the form came
  // back with Title/Description/Budget filled but City blank, which looked
  // broken. Only accept a city we actually serve; otherwise keep theirs.
  const aiCity = typeof parsed.city === "string" ? parsed.city.trim() : "";
  const matchedCity = PK_CITIES.find((c) => c.toLowerCase() === aiCity.toLowerCase());
  parsed.city = matchedCity || (city && city.trim()) || "";

  return parsed;
}

/* ------------------------------------------------------------------------- *
 * AI Proposal Writer (provider side)
 *
 * The mirror image of the task copilot: a provider taps "Draft with AI" on a
 * task and gets a short, specific, non-cringe proposal built from their own
 * profile (skills, city, rating, completed jobs) plus the task itself. Nobody
 * in the Pakistani market does this — Fiverr gives you saved "quick replies",
 * Upwork gives you generic writing help, and both cost real money per use.
 * ------------------------------------------------------------------------- */

export type ProposalDraft = {
  proposal: string;
  angle: string;
};

export async function draftProposal(input: {
  taskTitle: string;
  taskDescription: string;
  budget: number;
  currency: string;
  city?: string | null;
  provider: {
    name: string;
    skills?: string | null;
    city?: string | null;
    ratingAvg: number;
    ratingCount: number;
    completedJobs: number;
  };
}): Promise<ProposalDraft> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("AI Copilot is not configured (GROQ_API_KEY not set).");
  }

  const { provider, taskTitle, taskDescription, budget, currency, city } = input;

  const system = `You write short, winning proposals for KaamKaro, a Pakistani task marketplace.

Rules:
- 70-110 words, plain English (a light Roman Urdu touch is fine if the task is written that way).
- Open with one concrete sentence showing you understood THE SPECIFIC JOB, not a generic greeting.
- Mention at most two relevant skills from the provider profile, only if they truly fit.
- State a clear plan: what you will deliver first, and the turnaround.
- Never invent experience, certifications, clients, or numbers that are not in the profile.
- No "Dear Sir/Madam", no flattery, no emoji, no markdown, no placeholders like [name].
- End with one short question or a clear next step.

Respond with ONLY a JSON object: {"proposal": "...", "angle": "<max 6 word label of your approach>"}`;

  const user = `TASK: ${taskTitle}
DETAILS: ${taskDescription}
BUDGET: ${budget} ${currency}
CITY: ${city || "not specified"}

PROVIDER PROFILE
Name: ${provider.name}
Skills: ${provider.skills || "not listed"}
City: ${provider.city || "not listed"}
Rating: ${provider.ratingAvg ? provider.ratingAvg.toFixed(1) : "new"} (${provider.ratingCount} reviews)
Jobs completed on KaamKaro: ${provider.completedJobs}`;

  const candidates = [process.env.GROQ_MODEL, "openai/gpt-oss-120b", "openai/gpt-oss-20b"].filter(
    (m): m is string => Boolean(m)
  );

  let res: Response | null = null;
  let lastError = "";

  for (const model of candidates) {
    const attempt = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (attempt.ok) {
      res = attempt;
      break;
    }
    lastError = `${attempt.status} ${(await attempt.text().catch(() => "")).slice(0, 200)}`;
    if (attempt.status !== 404) break;
  }

  if (!res) {
    console.error("AI Proposal provider error:", lastError);
    throw new Error("AI Copilot is temporarily unavailable. Please write your proposal manually.");
  }

  const data = await res.json();
  const text: string | undefined = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("AI Copilot returned an empty draft. Please try again.");

  // Models occasionally wrap the JSON in prose or skip the braces entirely.
  // Rather than 500 on the user, fall back to using the raw text as the draft.
  const cleaned = text.replace(/```json|```/g, "").trim();
  let parsed: Partial<ProposalDraft> | null = null;
  try {
    parsed = JSON.parse(cleaned) as Partial<ProposalDraft>;
  } catch {
    const braces = cleaned.match(/\{[\s\S]*\}/);
    if (braces) {
      try {
        parsed = JSON.parse(braces[0]) as Partial<ProposalDraft>;
      } catch {
        parsed = null;
      }
    }
  }

  if (parsed && typeof parsed.proposal === "string" && parsed.proposal.trim()) {
    return { proposal: parsed.proposal.trim(), angle: (parsed.angle || "").trim() };
  }
  if (cleaned && cleaned.length > 40) {
    // Last resort: the raw completion is still a usable proposal.
    return { proposal: cleaned, angle: "" };
  }
  throw new Error("AI Copilot returned an empty draft. Please try again.");
}
