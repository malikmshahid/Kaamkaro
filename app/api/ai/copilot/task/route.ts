import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { draftTaskFromIdea } from "@/lib/aiCopilot";
import { z } from "zod";

const bodySchema = z.object({
  idea: z.string().min(4, "Tell us a bit more about what you need").max(1000),
  city: z.string().optional(),
});

// POST /api/ai/copilot/task — client gives a rough idea, AI drafts the full task.
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const draft = await draftTaskFromIdea(parsed.data.idea, parsed.data.city);
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("AI copilot error:", err);
    const message =
      err instanceof Error ? err.message : "AI Copilot failed. Please try again or fill the form manually.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
