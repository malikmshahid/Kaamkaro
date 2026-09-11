import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, tasks } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    const { id } = await params;
    const task = (await db.select().from(tasks).where(and(eq(tasks.id, id), or(eq(tasks.postedById, session.userId), eq(tasks.assignedProviderId, session.userId)))).limit(1))[0];
    if (!task) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    await db.delete(messages).where(eq(messages.taskId, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/conversations failed:", error);
    return NextResponse.json({ error: "Could not delete this conversation." }, { status: 500 });
  }
}