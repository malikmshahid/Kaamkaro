import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { authenticateAgent } from "@/lib/agentAuth";
import { z } from "zod";
import { randomUUID } from "crypto";

const createTaskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string().min(2),
  budget: z.number().positive(),
  city: z.string().optional(),
});

/**
 * GET /api/agent/tasks — list tasks this agent has posted (or all open tasks with ?scope=open)
 * Auth: Authorization: Bearer kk_live_...
 */
export async function GET(req: NextRequest) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope") || "mine";

    const results =
      scope === "open"
        ? await db.select().from(tasks).where(eq(tasks.status, "open")).orderBy(desc(tasks.createdAt))
        : await db
            .select()
            .from(tasks)
            .where(and(eq(tasks.postedById, agent.ownerId), eq(tasks.postedByType, "ai_agent")))
            .orderBy(desc(tasks.createdAt));

    return NextResponse.json({ tasks: results });

  } catch (err) {
    console.error("GET  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/tasks — an AI agent posts a new task for a human to complete.
 * Auth: Authorization: Bearer kk_live_...
 * Body: { title, description, category, budget, city? }
 */
export async function POST(req: NextRequest) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { title, description, category, budget, city } = parsed.data;
    const id = randomUUID();

    await db.insert(tasks).values({
      id,
      postedById: agent.ownerId,
      postedByType: "ai_agent",
      title,
      description,
      category,
      budget,
      city: city || null,
      status: "open",
    });

    return NextResponse.json({ success: true, taskId: id });

  } catch (err) {
    console.error("POST  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
