import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }
    const { id: taskId } = await params;
    const body = await req.json().catch(() => ({}));

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== "open") {
      return NextResponse.json({ error: "This task is no longer open" }, { status: 400 });
    }
    if (task.postedById === session.userId) {
      return NextResponse.json({ error: "You cannot apply to your own task" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(applications)
      .where(and(eq(applications.taskId, taskId), eq(applications.providerId, session.userId)))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "You have already applied" }, { status: 409 });
    }

    const id = randomUUID();
    await db.insert(applications).values({
      id,
      taskId,
      providerId: session.userId,
      message: body.message || null,
      status: "pending",
    });

    await notify(
      task.postedById,
      "application_received",
      `Someone applied to your task "${task.title}"`,
      taskId
    );

    return NextResponse.json({ success: true, applicationId: id });

  } catch (err) {
    console.error("POST failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
