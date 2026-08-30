import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { verifyTaskProof } from "@/lib/aiVerification";

// POST /api/tasks/[id]/verify — client (or the owner) re-runs AI verification manually
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    const { id: taskId } = await params;

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.postedById !== session.userId) {
      return NextResponse.json({ error: "Only the task owner can trigger verification" }, { status: 403 });
    }
    if (!["submitted", "completed"].includes(task.status)) {
      return NextResponse.json({ error: "The task must be submitted before it can be verified" }, { status: 400 });
    }

    const result = await verifyTaskProof(task.title, task.description, task.proofUrl);

    await db
      .update(tasks)
      .set({
        verificationStatus: result.status,
        verificationConfidence: result.confidence,
        verificationNotes: result.notes,
        verifiedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    return NextResponse.json({ success: true, result });

  } catch (err) {
    console.error("POST failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
