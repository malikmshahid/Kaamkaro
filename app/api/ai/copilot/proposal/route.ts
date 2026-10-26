import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users, reviews } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { draftProposal } from "@/lib/aiCopilot";
import { throttle, tooManyRequests } from "@/lib/rateLimit";

/**
 * POST /api/ai/copilot/proposal { taskId }
 *
 * Provider-side AI: drafts a proposal for a specific open task using the
 * provider's own profile + the task brief. Advisory only — the provider can
 * edit everything before sending.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const aiLimit = await throttle("aiCopilot", session.userId);
    if (!aiLimit.allowed) return tooManyRequests(aiLimit);

    const { taskId } = await req.json().catch(() => ({ taskId: "" }));
    if (!taskId || typeof taskId !== "string") {
      return NextResponse.json({ error: "Which task?" }, { status: 400 });
    }

    const taskRows = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = taskRows[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== "open") {
      return NextResponse.json({ error: "This task is no longer open" }, { status: 400 });
    }
    if (task.postedById === session.userId) {
      return NextResponse.json({ error: "You cannot apply to your own task" }, { status: 400 });
    }

    const meRows = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    const me = meRows[0];
    if (!me) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    // How many jobs this provider has actually finished here — the single most
    // credible thing to put in a proposal, and the AI may only use real numbers.
    const completed = await db
      .select({ value: count() })
      .from(tasks)
      .where(and(eq(tasks.assignedProviderId, session.userId), eq(tasks.status, "completed")));

    const draft = await draftProposal({
      taskTitle: task.title,
      taskDescription: task.description,
      budget: task.budget,
      currency: task.currency,
      city: task.city,
      provider: {
        name: me.name,
        skills: me.skills,
        city: me.city,
        ratingAvg: me.ratingAvg,
        ratingCount: me.ratingCount,
        completedJobs: Number(completed[0]?.value ?? 0),
      },
    });

    return NextResponse.json({ draft });
  } catch (err) {
    console.error("AI proposal error:", err);
    const friendly =
      err instanceof Error && err.message.startsWith("AI Copilot")
        ? err.message
        : "AI Copilot is temporarily unavailable. Please write your proposal manually.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
