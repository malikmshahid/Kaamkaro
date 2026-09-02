import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, messages, users } from "@/db/schema";
import { eq, asc, and, ne } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { randomUUID } from "crypto";

async function assertParticipant(taskId: string, userId: string) {
  const found = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1);

  const task = found[0];

  if (!task) return null;

  const isParticipant =
    task.postedById === userId ||
    task.assignedProviderId === userId;

  if (isParticipant) return task;

  // Admins can read chat history for disputed tasks.
  const userRow = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRow[0]?.role === "admin" && task.status === "disputed") {
    return task;
  }

  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();

    if (!session) {
      return NextResponse.json(
        { error: "Please log in first" },
        { status: 401 }
      );
    }

    const { id: taskId } = await params;

    const task = await assertParticipant(taskId, session.userId);

    if (!task) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    /*
     * Mark messages from the other participant as read.
     *
     * We only do this for normal participants.
     * Admins viewing disputed-task chat don't mark messages as read.
     */
    const isTaskParticipant =
      task.postedById === session.userId ||
      task.assignedProviderId === session.userId;

    if (isTaskParticipant) {
      await db
        .update(messages)
        .set({ isRead: true })
        .where(
          and(
            eq(messages.taskId, taskId),
            ne(messages.senderId, session.userId),
            eq(messages.isRead, false)
          )
        );
    }

    const rows = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        body: messages.body,
        createdAt: messages.createdAt,
        senderName: users.name,
        read: messages.isRead,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.taskId, taskId))
      .orderBy(asc(messages.createdAt));

    return NextResponse.json({
      messages: rows,
    });
  } catch (err) {
    console.error("GET messages failed:", err);

    return NextResponse.json(
      {
        error: "Something went wrong on our end. Please try again.",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();

    if (!session) {
      return NextResponse.json(
        { error: "Please log in first" },
        { status: 401 }
      );
    }

    const { id: taskId } = await params;

    const task = await assertParticipant(taskId, session.userId);

    if (!task) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    if (!task.assignedProviderId) {
      return NextResponse.json(
        {
          error:
            "Chat is not available until a provider is assigned.",
        },
        { status: 400 }
      );
    }

    const payload = await req.json();
    const body = payload?.body;

    if (
      typeof body !== "string" ||
      body.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );
    }

    const cleanBody = body.trim();

    if (cleanBody.length > 5000) {
      return NextResponse.json(
        {
          error:
            "Message is too long. Maximum is 5000 characters.",
        },
        { status: 400 }
      );
    }

    const messageId = randomUUID();

    await db.insert(messages).values({
      id: messageId,
      taskId,
      senderId: session.userId,
      body: cleanBody,
      isRead: false,
    });

    const otherPartyId =
      task.postedById === session.userId
        ? task.assignedProviderId
        : task.postedById;

    if (otherPartyId && otherPartyId !== session.userId) {
      await notify(
        otherPartyId,
        "new_message",
        `New message on "${task.title}"`,
        taskId
      );
    }

    return NextResponse.json({
      success: true,
      id: messageId,
    });
  } catch (err) {
    console.error("POST messages failed:", err);

    return NextResponse.json(
      {
        error: "Something went wrong on our end. Please try again.",
      },
      { status: 500 }
    );
  }
}