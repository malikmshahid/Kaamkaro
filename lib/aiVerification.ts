import Anthropic from "@anthropic-ai/sdk";

/**
 * AI Proof-of-Completion Verification
 * -------------------------------------
 * Jab provider kaam submit karta hai, ye module submitted proof (photo URL)
 * ko task ki description ke sath compare karta hai — Claude Vision se —
 * aur ek advisory verdict deta hai. Ye FINAL decision nahi hai: client hi
 * hamesha "complete confirm karein" button dabata hai. Ye sirf client ko
 * ek extra signal deta hai taake fraud/mismatch pehchanna aasan ho.
 *
 * Env var zaroori hai: ANTHROPIC_API_KEY
 * Agar key set nahi hai to verification skip ho jati hai (client sirf manually check karega).
 */

export type VerificationResult = {
  status: "pass" | "review_needed" | "fail" | "error";
  confidence: number; // 0-1
  notes: string;
};

async function fetchImageAsBase64(url: string): Promise<{ data: string; mediaType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return { data: base64, mediaType: contentType };
  } catch {
    return null;
  }
}

export async function verifyTaskProof(
  taskTitle: string,
  taskDescription: string,
  proofUrl: string | null
): Promise<VerificationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      status: "review_needed",
      confidence: 0,
      notes:
        "AI verification configure nahi hui (ANTHROPIC_API_KEY set nahi hai). Client manually check karein.",
    };
  }

  if (!proofUrl) {
    return {
      status: "review_needed",
      confidence: 0,
      notes: "Koi proof URL submit nahi hui — manual review zaroori hai.",
    };
  }

  const image = await fetchImageAsBase64(proofUrl);
  if (!image) {
    return {
      status: "review_needed",
      confidence: 0,
      notes:
        "Proof URL se image load nahi ho saki (link kaam nahi kar raha ya ye image nahi hai). Manual review zaroori hai.",
    };
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                data: image.data,
              },
            },
            {
              type: "text",
              text: `Ye task tha: "${taskTitle}" — ${taskDescription}

Is submitted photo ko dekh kar batayein ke ye task genuinely complete hua lagta hai ya nahi.
SIRF is JSON format mein respond karein, kuch aur nahi:
{"status": "pass" | "review_needed" | "fail", "confidence": 0.0-1.0, "notes": "1-2 sentence explanation in Roman Urdu"}

- "pass": photo clearly task ke completion ko match karti hai
- "review_needed": ambiguous hai, insaan ko check karna chahiye
- "fail": photo task se clearly mismatch hai ya fraud lagta hai`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { status: "review_needed", confidence: 0, notes: "AI se response parse nahi hui." };
    }

    const cleaned = textBlock.text.replace(/```json|```/g, "").trim();
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
      notes: `AI verification fail ho gayi: ${(err as Error).message}`,
    };
  }
}
