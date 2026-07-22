import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, messages, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { randomUUID } from "crypto";

async function assertParticipant(taskId: string, userId: string) {
  const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = found[0];
  if (!task) return null;
  const allowed = task.postedById === userId || task.assignedProviderId === userId;
  return allowed ? task : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  const { id: taskId } = await params;

  const task = await assertParticipant(taskId, session.userId);
  if (!task) return NextResponse.json({ error: "Access nahi hai" }, { status: 403 });

  const rows = await db
    .select({
      id: messages.id,
      senderId: messages.senderId,
      body: messages.body,
      createdAt: messages.createdAt,
      senderName: users.name,
    })
    .from(messages)
    .leftJoin(users, eq(messages.senderId, users.id))
    .where(eq(messages.taskId, taskId))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ messages: rows });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  const { id: taskId } = await params;

  const task = await assertParticipant(taskId, session.userId);
  if (!task) return NextResponse.json({ error: "Access nahi hai" }, { status: 403 });

  const { body } = await req.json();
  if (!body || typeof body !== "string" || body.trim().length === 0) {
    return NextResponse.json({ error: "Message khali nahi ho sakta" }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(messages).values({ id, taskId, senderId: session.userId, body: body.trim() });

  return NextResponse.json({ success: true, id });
}
