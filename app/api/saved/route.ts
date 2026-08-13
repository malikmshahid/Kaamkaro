import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { savedItems, tasks, tools } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { randomUUID } from "crypto";

// GET /api/saved — list the current user's saved tasks and tools, with details
export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const rows: { itemType: string; itemId: string }[] = await db
      .select()
      .from(savedItems)
      .where(eq(savedItems.userId, session.userId));

    const taskIds = rows.filter((r) => r.itemType === "task").map((r) => r.itemId);
    const toolIds = rows.filter((r) => r.itemType === "tool").map((r) => r.itemId);

    const savedTasks = taskIds.length
      ? await db.select().from(tasks).where(inArray(tasks.id, taskIds))
      : [];
    const savedTools = toolIds.length
      ? await db.select().from(tools).where(inArray(tools.id, toolIds))
      : [];

    return NextResponse.json({ tasks: savedTasks, tools: savedTools });
  } catch (err) {
    console.error("GET /api/saved failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}

// POST /api/saved — toggle save/unsave. Body: { itemType: "task"|"tool", itemId }
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const { itemType, itemId } = await req.json();
    if (!["task", "tool"].includes(itemType) || !itemId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(savedItems)
      .where(
        and(
          eq(savedItems.userId, session.userId),
          eq(savedItems.itemType, itemType),
          eq(savedItems.itemId, itemId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db.delete(savedItems).where(eq(savedItems.id, existing[0].id));
      return NextResponse.json({ success: true, saved: false });
    }

    await db.insert(savedItems).values({
      id: randomUUID(),
      userId: session.userId,
      itemType,
      itemId,
    });
    return NextResponse.json({ success: true, saved: true });
  } catch (err) {
    console.error("POST /api/saved failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
