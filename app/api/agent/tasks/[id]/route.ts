import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { authenticateAgent } from "@/lib/agentAuth";
import { throttleAgent, tooManyRequests } from "@/lib/rateLimit";
import { getPaymentProvider, computeCommission, paymentMode } from "@/lib/payments";
import { fulfilEscrow, logPaymentEvent } from "@/lib/payments/escrow";
import { makeBasketId } from "@/lib/payments/payfast";

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
    const limit = await throttleAgent("createTask", agent.keyId);
    if (!limit.allowed) return tooManyRequests(limit);

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const applicationId = typeof body?.applicationId === "string" ? body.applicationId : "";
    if (!["accept", "pay", "complete"].includes(action)) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

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
      // Atomic claim — an agent retrying must not swap the assigned provider.
      const claimed = await db
        .update(tasks)
        .set({ status: "assigned", assignedProviderId: application.providerId })
        .where(and(eq(tasks.id, id), eq(tasks.status, "open")))
        .returning({ id: tasks.id });
      if (claimed.length === 0) {
        return NextResponse.json({ error: "Task is no longer open" }, { status: 409 });
      }
      await db.update(applications).set({ status: "accepted" }).where(eq(applications.id, applicationId));
      return NextResponse.json({ success: true });
    }

    if (action === "pay") {
      if (task.status !== "assigned" || !task.assignedProviderId) {
        return NextResponse.json({ error: "Please accept a provider first" }, { status: 400 });
      }

      // Never fund twice — a retried agent call must not create a second escrow row.
      const existing = await db.select().from(payments).where(eq(payments.taskId, id)).limit(1);
      if (existing.length > 0) {
        return NextResponse.json(
          {
            error:
              existing[0].status === "pending"
                ? "A payment for this task is already waiting to be completed."
                : "This task has already been paid for.",
            paymentId: existing[0].id,
            status: existing[0].status,
          },
          { status: 409 }
        );
      }

      const { commissionRatePercent, commissionAmount, netPayoutAmount } = await computeCommission(
        task.budget
      );
      const { randomUUID } = await import("crypto");
      const paymentId = randomUUID();
      const mode = paymentMode();

      // ---------- mock mode: bookkeeping only, no money exists ----------
      if (mode === "mock") {
        const provider = getPaymentProvider();
        const result = await provider.charge(task.budget, agent.ownerId);
        if (!result.success) {
          return NextResponse.json({ error: "Payment failed" }, { status: 500 });
        }
        await db.insert(payments).values({
          id: paymentId,
          taskId: id,
          payerId: agent.ownerId,
          payeeId: task.assignedProviderId,
          amount: task.budget,
          currency: task.currency,
          commissionRatePercent,
          commissionAmount,
          netPayoutAmount,
          provider: "mock",
          status: "pending",
          providerRef: result.providerRef,
        });
        await logPaymentEvent(paymentId, "initiated", "Agent mock escrow (no gateway configured)");
        await fulfilEscrow({
          paymentId,
          source: "auto",
          providerStatus: "mock",
          payload: { mock: true, via: "agent-api", providerRef: result.providerRef },
        });
        return NextResponse.json({
          success: true,
          mode: "mock",
          paymentId,
          commissionAmount,
          netPayoutAmount,
        });
      }

      // ---------- real gateway: an agent cannot conjure escrow ----------
      // The owner still has to complete the hosted checkout with a card / wallet,
      // exactly like a human client. We only open the payment and hand back the URL.
      await db.insert(payments).values({
        id: paymentId,
        taskId: id,
        payerId: agent.ownerId,
        payeeId: task.assignedProviderId,
        amount: task.budget,
        currency: task.currency,
        commissionRatePercent,
        commissionAmount,
        netPayoutAmount,
        provider: "payfast",
        status: "pending",
        basketId: makeBasketId(),
        providerStatus: "initiated",
      });
      await logPaymentEvent(paymentId, "initiated", "Agent opened PayFast checkout", {
        via: "agent-api",
        amount: task.budget,
        currency: task.currency,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "Hosted checkout required: the account owner must complete the payment. Escrow is only funded after the gateway confirms it.",
          paymentId,
          checkoutUrl: `/pay/${paymentId}`,
          status: "pending",
        },
        { status: 402 }
      );
    }

    if (action === "complete") {
      if (task.status !== "submitted") {
        return NextResponse.json({ error: "The provider has not submitted yet" }, { status: 400 });
      }
      const payRows = await db.select().from(payments).where(eq(payments.taskId, id)).limit(1);
      const payment = payRows[0];
      if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 400 });

      // Only money that is actually being held can be released.
      if (payment.status !== "held_in_escrow") {
        return NextResponse.json(
          {
            error:
              payment.status === "released"
                ? "This payment has already been released"
                : "Escrow is not funded yet — complete the payment first",
            status: payment.status,
          },
          { status: 409 }
        );
      }

      const provider = getPaymentProvider();
      const result = await provider.release(
        payment.providerRef || "",
        task.assignedProviderId || "",
        payment.netPayoutAmount
      );
      if (!result.success) {
        return NextResponse.json({ error: "Payment release failed" }, { status: 500 });
      }

      // Conditional flips: a retried call releases exactly once.
      const released = await db
        .update(payments)
        .set({ status: "released", releasedAt: new Date() })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "held_in_escrow")))
        .returning({ id: payments.id });
      if (released.length === 0) {
        return NextResponse.json({ error: "This payment has already been released" }, { status: 409 });
      }
      const completed = await db
        .update(tasks)
        .set({ status: "completed" })
        .where(and(eq(tasks.id, id), eq(tasks.status, "submitted")))
        .returning({ id: tasks.id });
      if (completed.length === 0) {
        return NextResponse.json({ error: "This task is no longer awaiting confirmation" }, { status: 409 });
      }

      await logPaymentEvent(payment.id, "released", "Escrow released by AI agent", {
        amount: payment.netPayoutAmount,
        currency: payment.currency,
        via: "agent-api",
        releasedBy: agent.ownerId,
      });
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
