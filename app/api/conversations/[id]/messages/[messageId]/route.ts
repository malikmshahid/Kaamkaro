import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, tasks } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    const { id, messageId } = await params;
    const task = (await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, id), or(eq(tasks.postedById, session.userId), eq(tasks.assignedProviderId, session.userId)))).limit(1))[0];
    if (!task) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    const deleted = await db.delete(messages).where(and(eq(messages.id, messageId), eq(messages.taskId, id), eq(messages.senderId, session.userId))).returning({ id: messages.id });
    if (deleted.length === 0) return NextResponse.json({ error: "Message not found or cannot be deleted" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/conversations/message failed:", error);
    return NextResponse.json({ error: "Could not delete this message." }, { status: 500 });
  }
}