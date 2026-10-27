import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { guardRequest } from "@/lib/rateLimit";
import { notify } from "@/lib/notify";
import { z } from "zod";

// A dispute is a claim an admin has to adjudicate, so the reason is required
// and bounded — an empty dispute just parks a task in limbo.
const disputeSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Please describe the issue in at least 10 characters")
    .max(1000, "Keep the explanation under 1000 characters"),
});


// POST /api/tasks/[id]/dispute — either the client or the assigned provider
// can flag a problem while the task is in progress. An admin then reviews it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await guardRequest(req, "taskAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    const { id: taskId } = await params;
    const parsed = disputeSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Please describe the problem" },
        { status: 400 }
      );
    }
    const { reason } = parsed.data;

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const isParticipant = task.postedById === session.userId || task.assignedProviderId === session.userId;
    if (!isParticipant) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    if (!["assigned", "submitted"].includes(task.status)) {
      return NextResponse.json(
        { error: "Disputes can only be raised on assigned or submitted tasks" },
        { status: 400 }
      );
    }

    await db
      .update(tasks)
      .set({
        status: "disputed",
        verificationNotes: reason
          ? `Dispute reason: ${reason}`
          : task.verificationNotes,
      })
      .where(eq(tasks.id, taskId));

    const otherPartyId =
      task.postedById === session.userId ? task.assignedProviderId : task.postedById;
    if (otherPartyId) {
      await notify(
        otherPartyId,
        "dispute_raised",
        `A dispute was raised on "${task.title}" — an admin will review it`,
        taskId
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("POST failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
