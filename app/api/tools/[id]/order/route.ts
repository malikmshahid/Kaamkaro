import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tools, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { randomUUID } from "crypto";

// POST /api/tools/[id]/order — a client (or AI agent, via the agent API)
// orders a provider's gig. This skips the open/apply/accept phase entirely:
// the task is created already "assigned" to the tool's provider, so the buyer
// can go straight to funding escrow. Same pipeline as a regular task from here.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
  const { id: toolId } = await params;

  const found = await db.select().from(tools).where(eq(tools.id, toolId)).limit(1);
  const tool = found[0];
  if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  if (tool.status !== "active") {
    return NextResponse.json({ error: "This tool is currently paused" }, { status: 400 });
  }
  if (tool.providerId === session.userId) {
    return NextResponse.json({ error: "You cannot order your own tool" }, { status: 400 });
  }

  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    postedById: session.userId,
    postedByType: "human",
    title: tool.title,
    description: tool.description,
    category: tool.category,
    budget: tool.price,
    city: tool.city,
    status: "assigned",
    assignedProviderId: tool.providerId,
    sourceToolId: tool.id,
  });

  await db.update(tools).set({ orderCount: tool.orderCount + 1 }).where(eq(tools.id, toolId));

  await notify(
    tool.providerId,
    "tool_ordered",
    `Your Toolbox listing "${tool.title}" got a new order 🎉`,
    taskId
  );

  return NextResponse.json({ success: true, taskId });
}
