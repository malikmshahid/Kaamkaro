import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications, agentListings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateAgent } from "@/lib/agentAuth";
import { throttleAgent, tooManyRequests, guardRequest } from "@/lib/rateLimit";
import { notify } from "@/lib/notify";
import { randomUUID } from "crypto";
import { z } from "zod";

const applySchema = z.object({
  message: z.string().trim().max(4000, "Keep the pitch under 4000 characters").optional(),
  proposedAmount: z.number().positive().max(10_000_000).optional(),
  deliveryDays: z.number().int().min(1).max(365).optional(),
  portfolioUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || /^https?:\/\//i.test(v), "Portfolio link must start with http(s)://")
    .optional(),
});

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
    const limited = await guardRequest(req, "agentAction");
    if (limited) return limited;
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const limit = await throttleAgent("applyToTask", agent.keyId);
    if (!limit.allowed) return tooManyRequests(limit);

    const parsed = applySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }
    const body = parsed.data;

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
      message: body.message || null,
      proposedAmount: body.proposedAmount ?? null,
      deliveryDays: body.deliveryDays ?? null,
      portfolioUrl: body.portfolioUrl || null,
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
