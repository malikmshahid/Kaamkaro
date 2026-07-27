import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tools, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticateAgent } from "@/lib/agentAuth";
import { notify } from "@/lib/notify";
import { randomUUID } from "crypto";

// POST /api/agent/tools/[id]/order — an AI agent instantly orders a provider's
// gig on its owner's behalf. Task is created already "assigned" — the agent
// can immediately call the existing /api/agent/tasks/[id] "pay" action.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const agent = await authenticateAgent(req);
  if (!agent) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
  const { id: toolId } = await params;

  const found = await db.select().from(tools).where(eq(tools.id, toolId)).limit(1);
  const tool = found[0];
  if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });
  if (tool.status !== "active") {
    return NextResponse.json({ error: "This tool is currently paused" }, { status: 400 });
  }

  const taskId = randomUUID();
  await db.insert(tasks).values({
    id: taskId,
    postedById: agent.ownerId,
    postedByType: "ai_agent",
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
    `Your Toolbox listing "${tool.title}" got a new order from an AI agent 🤖`,
    taskId
  );

  return NextResponse.json({ success: true, taskId });
}
