/**
 * AI Dispute Mediator
 * -------------------
 * Both sides of a disputed job are emotional and long-winded; an admin reading
 * 300 chat messages from scratch makes slower, less consistent decisions.
 *
 * This module reads the *evidence already on the platform* — task brief,
 * escrow amount, proof submissions, and both parties' chat — and produces a
 * neutral brief: what each side claims, what the record actually shows, the
 * three outcomes an admin could pick, and the risks in each.
 *
 * Hard rule: it never decides. The model outputs a recommendation with a
 * confidence and the specific evidence ids it relies on; the admin presses the
 * refund/release button. This mirrors how the platform treats AI everywhere —
 * an advisory signal, never the final authority on money.
 */
import { db } from "@/db";
import { messages, tasks, users, payments } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export type MediatorSuggestion = {
  available: boolean;
  reason?: string;
  summary: string;
  clientCase: string;
  providerCase: string;
  evidenceGaps: string[];
  recommendation: "release_provider" | "refund_client" | "split_not_possible" | "need_more_info";
  confidence: number; // 0-1
  rationale: string;
  fairnessNote: string;
  messageCount: number;
  model: string;
};

const FALLBACK = (reason: string, messageCount: number, model = "none"): MediatorSuggestion => ({
  available: false,
  reason,
  summary: "",
  clientCase: "",
  providerCase: "",
  evidenceGaps: [],
  recommendation: "need_more_info",
  confidence: 0,
  rationale: "",
  fairnessNote: "",
  messageCount,
  model,
});

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export async function mediateDispute(taskId: string): Promise<MediatorSuggestion> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) return FALLBACK("Task not found", 0);

  const chat: {
    senderId: string;
    body: string;
    createdAt: Date;
    senderName: string | null;
  }[] = await db
    .select({
      senderId: messages.senderId,
      body: messages.body,
      createdAt: messages.createdAt,
      senderName: users.name,
    })
    .from(messages)
    .leftJoin(users, eq(users.id, messages.senderId))
    .where(eq(messages.taskId, taskId))
    .orderBy(asc(messages.createdAt))
    .limit(200);

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.taskId, taskId))
    .limit(1);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return FALLBACK(
      "AI mediation is not configured on this server (GROQ_API_KEY missing).",
      chat.length
    );
  }

  // Keep the transcript under a sane token budget: the last 120 messages matter
  // far more than the greeting, so we trim from the top.
  const transcript = chat
    .slice(-120)
    .map((m) => {
      const side =
        m.senderId === task.postedById
          ? "CLIENT"
          : m.senderId === task.assignedProviderId
            ? "PROVIDER"
            : "OTHER";
      return `[${new Date(m.createdAt).toISOString().slice(0, 16)}] ${side}${m.senderName ? ` (${m.senderName})` : ""}: ${clip(m.body, 600)}`;
    })
    .join("\n");

  const prompt = `You are a neutral dispute mediator for KaamKaro, a Pakistani task marketplace that holds payment in escrow.

JOB
Title: ${task.title}
Category: ${task.category}
Status: ${task.status}
Budget: ${task.budget} ${task.currency}
Escrow: ${payment ? `${payment.amount} ${payment.currency}, status=${payment.status}` : "no payment record"}
Proof submitted: ${task.proofUrl ? `yes (${task.proofUrl.slice(0, 120)})` : "no"}
Delivery note: ${clip(task.proofNote || "(none)", 400)}
AI proof verdict: ${task.verificationStatus || "not run"} (confidence ${task.verificationConfidence ?? 0}) — ${clip(task.verificationNotes || "", 400)}
Description: ${clip(task.description, 1500)}

CHAT TRANSCRIPT (oldest first)
${transcript || "(no messages)"}

Produce a fair, evidence-based mediation brief. Be concrete and quote timestamps when you rely on a message. Never take a side because of tone or politeness — only because of what the record supports.

Respond ONLY with JSON:
{
  "summary": "3-4 sentences: what this job was, what went wrong, where it stands",
  "clientCase": "what the client claims and which messages/proof support it",
  "providerCase": "what the provider claims and which messages/proof support it",
  "evidenceGaps": ["specific missing evidence, e.g. 'no before/after photo', 'client never stated the deadline'"],
  "recommendation": "release_provider" | "refund_client" | "need_more_info",
  "confidence": 0.0-1.0,
  "rationale": "why this outcome follows from the evidence",
  "fairnessNote": "one line a human admin should weigh before deciding — including any risk of unfairness to the losing side"
}`;

  try {
    // GROQ_API_BASE exists so this path can be exercised against a stub in
    // tests; in production it is always the real Groq endpoint.
    const base = process.env.GROQ_API_BASE || "https://api.groq.com/openai/v1";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
        max_tokens: 1100,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`AI mediator provider error (${res.status}):`, detail.slice(0, 300));
      return FALLBACK(
        "The AI mediator is busy right now — try again, or decide manually.",
        chat.length
      );
    }

    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) return FALLBACK("The AI mediator returned an empty response.", chat.length);

    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as Record<string, unknown>;

    const rec = ["release_provider", "refund_client", "need_more_info"].includes(
      String(parsed.recommendation)
    )
      ? (parsed.recommendation as MediatorSuggestion["recommendation"])
      : "need_more_info";

    return {
      available: true,
      summary: String(parsed.summary || "").slice(0, 1200),
      clientCase: String(parsed.clientCase || "").slice(0, 900),
      providerCase: String(parsed.providerCase || "").slice(0, 900),
      evidenceGaps: Array.isArray(parsed.evidenceGaps)
        ? parsed.evidenceGaps.slice(0, 6).map((g) => String(g).slice(0, 220))
        : [],
      recommendation: rec,
      confidence:
        typeof parsed.confidence === "number"
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0.4,
      rationale: String(parsed.rationale || "").slice(0, 900),
      fairnessNote: String(parsed.fairnessNote || "").slice(0, 400),
      messageCount: chat.length,
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    };
  } catch (err) {
    console.error("AI mediator failed:", err);
    return FALLBACK("The AI mediator could not be reached.", chat.length);
  }
}
