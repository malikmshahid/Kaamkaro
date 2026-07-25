import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

// POST /api/tasks/[id]/dispute — either the client or the assigned provider
// can flag a problem while the task is in progress. An admin then reviews it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  const { id: taskId } = await params;
  const { reason } = await req.json().catch(() => ({ reason: "" }));

  const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = found[0];
  if (!task) return NextResponse.json({ error: "Task nahi mila" }, { status: 404 });

  const isParticipant = task.postedById === session.userId || task.assignedProviderId === session.userId;
  if (!isParticipant) {
    return NextResponse.json({ error: "Access nahi hai" }, { status: 403 });
  }
  if (!["assigned", "submitted"].includes(task.status)) {
    return NextResponse.json(
      { error: "Sirf assigned ya submitted task pe dispute utha sakte hain" },
      { status: 400 }
    );
  }

  await db
    .update(tasks)
    .set({
      status: "disputed",
      verificationNotes: reason
        ? `Dispute wajah: ${reason}`
        : task.verificationNotes,
    })
    .where(eq(tasks.id, taskId));

  return NextResponse.json({ success: true });
}
