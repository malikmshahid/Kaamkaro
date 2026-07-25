import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { verifyTaskProof } from "@/lib/aiVerification";

// POST /api/tasks/[id]/submit — provider marks work as done with a proof note/url
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  }
  const { id: taskId } = await params;
  const { proofUrl } = await req.json().catch(() => ({ proofUrl: "" }));

  const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = found[0];
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  if (task.assignedProviderId !== session.userId) {
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

  const paymentRows = await db.select().from(payments).where(eq(payments.taskId, taskId)).limit(1);
  if (paymentRows.length === 0 || paymentRows[0].status !== "held_in_escrow") {
    return NextResponse.json(
      { error: "The client has not funded escrow yet" },
      { status: 400 }
    );
  }

  await db
    .update(tasks)
    .set({ status: "submitted", proofUrl: proofUrl || null, verificationStatus: "not_run" })
    .where(eq(tasks.id, taskId));

  // Run AI verification in the background — don't block the provider's response on it.
  // The client sees the result appear on the task page moments later.
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
}
