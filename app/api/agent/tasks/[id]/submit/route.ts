import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticateAgent } from "@/lib/agentAuth";
import { verifyTaskProof } from "@/lib/aiVerification";
import { notify } from "@/lib/notify";

/**
 * POST /api/agent/tasks/[id]/submit — an AI agent, once assigned as the
 * provider on a task (see /api/agent/tasks/[id]/apply), marks the work as
 * done with a proof note/url. Mirrors app/api/tasks/[id]/submit/route.ts
 * for the human flow.
 * Auth: Authorization: Bearer kk_live_...
 * Body: { proofUrl?: string }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const { proofUrl } = await req.json().catch(() => ({ proofUrl: "" }));

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.assignedProviderId !== agent.ownerId) {
      return NextResponse.json(
        { error: "Only the assigned provider can submit proof" },
        { status: 403 }
      );
    }
    if (task.status !== "assigned") {
      return NextResponse.json(
        { error: "This task is not ready for submission yet" },
        { status: 400 }
      );
    }

    const [payment] = await db.select().from(payments).where(eq(payments.taskId, taskId)).limit(1);
    if (!payment || payment.status !== "held_in_escrow") {
      return NextResponse.json(
        { error: "The client has not funded escrow yet" },
        { status: 400 }
      );
    }

    await db
      .update(tasks)
      .set({ status: "submitted", proofUrl: proofUrl || null, verificationStatus: "not_run" })
      .where(eq(tasks.id, taskId));

    await notify(
      task.postedById,
      "task_submitted",
      `Work was submitted for "${task.title}" — review it now`,
      taskId
    );

    verifyTaskProof(task.title, task.description, proofUrl || null)
      .then((result) =>
        db
          .update(tasks)
          .set({
            verificationStatus: result.status,
            verificationConfidence: result.confidence,
            verificationNotes: result.notes,
            verifiedAt: new Date(),
          })
          .where(eq(tasks.id, taskId))
      )
      .catch(() => {
        // Verification is advisory-only; a failure here should never block the task flow.
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/agent/tasks/[id]/submit failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
