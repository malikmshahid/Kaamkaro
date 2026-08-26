import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages, tasks, users } from "@/db/schema";
import { asc, eq, or } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

type ParticipantTask = {
  id: string;
  title: string;
  postedById: string;
  assignedProviderId: string | null;
};

type MessageRow = {
  id: string;
  body: string;
  senderId: string;
  createdAt: Date;
};

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const participantTasks = await db
      .select()
      .from(tasks)
      .where(or(eq(tasks.postedById, session.userId), eq(tasks.assignedProviderId, session.userId)));

    const conversations = await Promise.all(
      participantTasks.map(async (task: ParticipantTask) => {
        const rows = (await db
          .select({
            id: messages.id,
            body: messages.body,
            senderId: messages.senderId,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.taskId, task.id))
          .orderBy(asc(messages.createdAt))) as MessageRow[];

        if (rows.length === 0) return null;

        const otherPartyId = task.postedById === session.userId ? task.assignedProviderId : task.postedById;
        const otherParty = otherPartyId
          ? (await db.select({ name: users.name, role: users.role }).from(users).where(eq(users.id, otherPartyId)).limit(1))[0]
          : null;
        const lastMessage = rows[rows.length - 1];
        const name = otherParty?.name || "Task conversation";

        return {
          id: task.id,
          taskTitle: task.title,
          name,
          initials: name.split(" ").map((part: string) => part[0]).join("").slice(0, 2).toUpperCase(),
          role: otherParty?.role || "participant",
          lastMessage: lastMessage.body,
          timestamp: lastMessage.createdAt.toISOString(),
          unread: rows.filter((message: MessageRow) => message.senderId !== session.userId).length,
          messages: rows.map((message: MessageRow) => ({
            id: message.id,
            body: message.body,
            timestamp: message.createdAt.toISOString(),
            outgoing: message.senderId === session.userId,
            read: message.senderId === session.userId,
          })),
        };
      }),
    );

    return NextResponse.json({ conversations: conversations.filter(Boolean) });
  } catch (error) {
    console.error("GET /api/conversations failed:", error);
    return NextResponse.json({ error: "Could not load conversations right now." }, { status: 500 });
  }
}