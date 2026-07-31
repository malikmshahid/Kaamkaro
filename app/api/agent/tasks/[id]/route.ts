import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authenticateAgent } from "@/lib/agentAuth";
import { getPaymentProvider } from "@/lib/payments";

/**
 * GET /api/agent/tasks/[id] — check status of a task the agent posted.
 * Auth: Authorization: Bearer kk_live_...
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }
    const { id } = await params;

    const found = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    const task = found[0];
    if (!task || task.postedById !== agent.ownerId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const apps = await db.select().from(applications).where(eq(applications.taskId, id));

    return NextResponse.json({ task, applications: apps });

  } catch (err) {
    console.error("GET failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/tasks/[id] — agent-triggered actions on its own task.
 * Body: { action: "pay" | "accept" | "complete", applicationId? }
 * This mirrors the human flows (pay/accept/complete) so an AI agent can drive
 * the same lifecycle a human client would through the web UI.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const agent = await authenticateAgent(req);
    if (!agent) {
      return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });
    }
    const { id } = await params;
    const { action, applicationId } = await req.json();

    const found = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    const task = found[0];
    if (!task || task.postedById !== agent.ownerId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (action === "accept") {
      if (task.status !== "open") {
        return NextResponse.json({ error: "Task is not open" }, { status: 400 });
      }
      const appFound = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
      const application = appFound[0];
      if (!application || application.taskId !== id) {
        return NextResponse.json({ error: "Application not found" }, { status: 404 });
      }
      await db.update(applications).set({ status: "accepted" }).where(eq(applications.id, applicationId));
      await db
        .update(tasks)
        .set({ status: "assigned", assignedProviderId: application.providerId })
        .where(eq(tasks.id, id));
      return NextResponse.json({ success: true });
    }

    if (action === "pay") {
      if (task.status !== "assigned" || !task.assignedProviderId) {
        return NextResponse.json({ error: "Please accept a provider first" }, { status: 400 });
      }
      const provider = getPaymentProvider();
      const result = await provider.charge(task.budget, agent.ownerId);
      if (!result.success) return NextResponse.json({ error: "Payment fail" }, { status: 500 });

      const { randomUUID } = await import("crypto");
      await db.insert(payments).values({
        id: randomUUID(),
        taskId: id,
        payerId: agent.ownerId,
        payeeId: task.assignedProviderId,
        amount: task.budget,
        provider: "mock",
        status: "held_in_escrow",
        providerRef: result.providerRef,
      });
      return NextResponse.json({ success: true });
    }

    if (action === "complete") {
      if (task.status !== "submitted") {
        return NextResponse.json({ error: "The provider has not submitted yet" }, { status: 400 });
      }
      const payRows = await db.select().from(payments).where(eq(payments.taskId, id)).limit(1);
      const payment = payRows[0];
      if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 400 });

      const provider = getPaymentProvider();
      await provider.release(payment.providerRef || "", task.assignedProviderId || "");
      await db.update(payments).set({ status: "released", releasedAt: new Date() }).where(eq(payments.taskId, id));
      await db.update(tasks).set({ status: "completed" }).where(eq(tasks.id, id));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (err) {
    console.error("POST failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
