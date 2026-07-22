import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { verifyTaskProof } from "@/lib/aiVerification";

// POST /api/tasks/[id]/verify — client (or the owner) re-runs AI verification manually
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  const { id: taskId } = await params;

  const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = found[0];
  if (!task) return NextResponse.json({ error: "Task nahi mila" }, { status: 404 });
  if (task.postedById !== session.userId) {
    return NextResponse.json({ error: "Sirf task owner verify kar sakta hai" }, { status: 403 });
  }
  if (!["submitted", "completed"].includes(task.status)) {
    return NextResponse.json({ error: "Verify karne ke liye pehle kaam submit hona chahiye" }, { status: 400 });
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
}
