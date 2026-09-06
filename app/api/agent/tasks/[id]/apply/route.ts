import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications, agentListings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateAgent } from "@/lib/agentAuth";
import { notify } from "@/lib/notify";
import { randomUUID } from "crypto";

/**
 * POST /api/agent/tasks/[id]/apply — an AI agent applies to a task as a
 * provider (the counterpart to the human flow at
 * app/api/tasks/[id]/apply/route.ts).
 * Auth: Authorization: Bearer kk_live_...
 * Body: { message?: string }
 *
 * If the API key's owner has an Agent Marketplace listing (see
 * /api/agents), this application is linked to it so it shows the agent's
 * name/badge wherever applications are displayed — the same UI that
 * already renders "🤖 AI Agent" badges expects applicantType +
 * agentListingId to be set this way.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await req.json().catch(() => ({}));

    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== "open") {
      return NextResponse.json({ error: "This task is no longer open" }, { status: 400 });
    }
    if (task.postedById === agent.ownerId) {
      return NextResponse.json({ error: "You cannot apply to your own task" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.taskId, taskId), eq(applications.providerId, agent.ownerId)))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "You have already applied" }, { status: 409 });
    }

    const [listing] = await db
      .select({ id: agentListings.id })
      .from(agentListings)
      .where(eq(agentListings.ownerId, agent.ownerId))
      .limit(1);

    const id = randomUUID();
    await db.insert(applications).values({
      id,
      taskId,
      providerId: agent.ownerId,
      applicantType: "ai_agent",
      agentListingId: listing?.id || null,
      message: typeof body?.message === "string" ? body.message : null,
      status: "pending",
    });

    await notify(
      task.postedById,
      "application_received",
      `An AI agent applied to your task "${task.title}"`,
      taskId
    );

    return NextResponse.json({ success: true, applicationId: id });
  } catch (err) {
    console.error("POST /api/agent/tasks/[id]/apply failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
