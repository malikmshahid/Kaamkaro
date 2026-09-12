/**
 * AI Proof-of-Completion Verification
 * -------------------------------------
 * When a provider submits a task, this module compares the submitted proof
 * (a photo URL) against the task description using Grok Vision, and
 * returns an advisory verdict. This is NOT the final decision — the client
 * always presses the "confirm complete" button themselves. It's just an
 * extra signal to help spot fraud or mismatches quickly.
 *
 * Requires the XAI_API_KEY env var. If it's not set, verification is
 * skipped gracefully (the client is told to check manually).
 */

export type VerificationResult = {
  status: "pass" | "review_needed" | "fail" | "error";
  confidence: number; // 0-1
  notes: string;
};

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function verifyTaskProof(
  taskTitle: string,
  taskDescription: string,
  proofUrl: string | null
): Promise<VerificationResult> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      status: "review_needed",
      confidence: 0,
      notes: "AI verification is not configured (XAI_API_KEY not set). Please review manually.",
    };
  }

  if (!proofUrl) {
    return {
      status: "review_needed",
      confidence: 0,
      notes: "No proof URL was submitted — manual review required.",
    };
  }

  const imageDataUrl = await fetchImageAsDataUrl(proofUrl);
  if (!imageDataUrl) {
    return {
      status: "review_needed",
      confidence: 0,
      notes:
        "Could not load the image from the proof URL (broken link or not an image). Manual review required.",
    };
  }

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.GROK_VISION_MODEL || process.env.GROK_MODEL || "grok-4",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `The task was: "${taskTitle}" — ${taskDescription}

Look at this submitted photo and judge whether the task genuinely appears complete.
Respond ONLY in this JSON format, nothing else:
{"status": "pass" | "review_needed" | "fail", "confidence": 0.0-1.0, "notes": "1-2 sentence explanation"}

- "pass": the photo clearly matches the completed task
- "review_needed": ambiguous, a human should check
- "fail": the photo clearly mismatches the task or looks fraudulent`,
              },
              {
                type: "image_url",
                image_url: { url: imageDataUrl },
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        status: "error",
        confidence: 0,
        notes: `AI verification failed (${res.status}): ${errText.slice(0, 200)}`,
      };
    }

    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) {
      return { status: "review_needed", confidence: 0, notes: "Could not parse the AI's response." };
    }

    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as { status: string; confidence: number; notes: string };

    const status: VerificationResult["status"] = ["pass", "review_needed", "fail"].includes(
      parsed.status
    )
      ? (parsed.status as VerificationResult["status"])
      : "review_needed";

    return {
      status,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      notes: parsed.notes || "",
    };
  } catch (err) {
    return {
      status: "error",
      confidence: 0,
      notes: `AI verification failed: ${(err as Error).message}`,
    };
  }
}
