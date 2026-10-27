import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { z } from "zod";
import { guardRequest } from "@/lib/rateLimit";

const acceptSchema = z.object({
  applicationId: z.string().trim().min(1, "Pick an application first").max(64),
});


export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await guardRequest(req, "taskAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }
    const { id: taskId } = await params;
    const parsed = acceptSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Pick an application first" }, { status: 400 });
    }
    const { applicationId } = parsed.data;

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.postedById !== session.userId) {
      return NextResponse.json({ error: "Only the task owner can accept applications" }, { status: 403 });
    }
    if (task.status !== "open") {
      return NextResponse.json(
        { error: "This task is no longer open for applications" },
        { status: 409 }
      );
    }

    const appFound = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);
    const application = appFound[0];
    if (!application || application.taskId !== taskId) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Claim the task atomically. Two tabs (or two requests racing) must not be
    // able to assign two different providers — the loser gets a clear 409.
    const claimed = await db
      .update(tasks)
      .set({ status: "assigned", assignedProviderId: application.providerId })
      .where(and(eq(tasks.id, taskId), eq(tasks.status, "open")))
      .returning({ id: tasks.id });
    if (claimed.length === 0) {
      return NextResponse.json(
        { error: "Someone was already accepted for this task" },
        { status: 409 }
      );
    }

    await db
      .update(applications)
      .set({ status: "accepted" })
      .where(eq(applications.id, applicationId));

    await db
      .update(applications)
      .set({ status: "rejected" })
      .where(
        and(
          eq(applications.taskId, taskId),
          eq(applications.status, "pending"),
          ne(applications.id, applicationId)
        )
      );

    await notify(
      application.providerId,
      "task_accepted",
      `You were accepted for "${task.title}" — waiting on escrow funding`,
      taskId
    );

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("POST failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
