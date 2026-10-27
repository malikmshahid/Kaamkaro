import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { messages, tasks } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { guardRequest } from "@/lib/rateLimit";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await guardRequest(_req, "conversationAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    const { id } = await params;
    const task = (await db.select().from(tasks).where(and(eq(tasks.id, id), or(eq(tasks.postedById, session.userId), eq(tasks.assignedProviderId, session.userId)))).limit(1))[0];
    if (!task) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    // A chat on a live job is shared evidence — escrow release and disputes are
    // decided on it. Only a task that nobody has been hired for yet can be
    // cleared, and even then the other participant's history is the same rows,
    // so we say so plainly instead of silently wiping it.
    if (task.status !== "open") {
      return NextResponse.json(
        {
          error:
            "This conversation belongs to a job that is already in progress. Messages on an assigned, delivered or disputed task cannot be deleted — they are part of the escrow record.",
        },
        { status: 409 }
      );
    }

    await db.delete(messages).where(eq(messages.taskId, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/conversations failed:", error);
    return NextResponse.json({ error: "Could not delete this conversation." }, { status: 500 });
  }
}