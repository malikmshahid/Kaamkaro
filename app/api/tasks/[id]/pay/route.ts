import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, payments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider, computeCommission, paymentMode } from "@/lib/payments";
import {
  getPayFastConfig,
  requestAccessToken,
  buildCheckoutForm,
  makeBasketId,
} from "@/lib/payments/payfast";
import { logPaymentEvent, fulfilEscrow } from "@/lib/payments/escrow";
import { throttle, tooManyRequests } from "@/lib/rateLimit";
import { randomUUID } from "crypto";

export const maxDuration = 30;

/**
 * POST /api/tasks/[id]/pay
 *
 * Funds escrow for an assigned task.
 *
 *  - PayFast configured → creates a `pending` payment, asks PayFast for an
 *    access token and returns the hosted-checkout form. The money is NOT
 *    considered held until PayFast's callback + our own status check agree.
 *  - No credentials yet → the old mock behaviour, clearly labelled "mock" in
 *    the UI. Useful for demos and for testing the whole loop end to end.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const { id: taskId } = await params;

    const payLimit = await throttle("createTask", `pay:${session.userId}`);
    if (!payLimit.allowed) return tooManyRequests(payLimit);

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.postedById !== session.userId) {
      return NextResponse.json({ error: "Only the client can make the payment" }, { status: 403 });
    }
    if (task.status !== "assigned" || !task.assignedProviderId) {
      return NextResponse.json({ error: "Accept a provider before paying" }, { status: 400 });
    }

    const existing = await db.select().from(payments).where(eq(payments.taskId, taskId)).limit(1);
    if (existing.length > 0) {
      const p = existing[0];
      // A pending PayFast checkout can be resumed instead of erroring.
      if (p.status === "pending" && p.basketId) {
        return NextResponse.json({
          success: false,
          error: "A payment for this task is already waiting for confirmation.",
          paymentId: p.id,
          status: p.status,
          resumeUrl: `/pay/return?basket=${encodeURIComponent(p.basketId)}`,
        }, { status: 409 });
      }
      return NextResponse.json({ error: "Payment has already been made" }, { status: 409 });
    }

    const { commissionRatePercent, commissionAmount, netPayoutAmount } =
      await computeCommission(task.budget);

    const mode = paymentMode();
    const id = randomUUID();
    const me = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    const payer = me[0];
    const origin = new URL(req.url).origin;

    // ---------- mock mode: bookkeeping only ----------
    if (mode === "mock") {
      const provider = getPaymentProvider();
      const result = await provider.charge(task.budget, session.userId);

      await db.insert(payments).values({
        id,
        taskId,
        payerId: session.userId,
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
      await logPaymentEvent(id, "initiated", "Mock escrow (no gateway credentials configured)");
      await fulfilEscrow({
        paymentId: id,
        source: "auto",
        providerStatus: "mock",
        payload: { mock: true, providerRef: result.providerRef },
      });

      return NextResponse.json({
        success: true,
        mode: "mock",
        paymentId: id,
        commissionAmount,
        netPayoutAmount,
      });
    }

    // ---------- PayFast mode ----------
    const cfg = getPayFastConfig();
    if (!cfg) {
      return NextResponse.json({ error: "Payment gateway is not configured" }, { status: 503 });
    }

    const basketId = makeBasketId();
    await db.insert(payments).values({
      id,
      taskId,
      payerId: session.userId,
      payeeId: task.assignedProviderId,
      amount: task.budget,
      currency: task.currency,
      commissionRatePercent,
      commissionAmount,
      netPayoutAmount,
      provider: "payfast",
      status: "pending",
      basketId,
      providerStatus: "initiated",
    });
    await logPaymentEvent(id, "initiated", `PayFast ${cfg.mode} checkout requested`, {
      basketId,
      amount: task.budget,
      currency: task.currency,
    });

    const token = await requestAccessToken(cfg, {
      basketId,
      amount: task.budget,
      currency: task.currency,
    });
    if (!token.ok) {
      await logPaymentEvent(id, "error", `Access token failed: ${token.error}`);
      return NextResponse.json(
        { error: "The payment gateway is not responding right now. Please try again in a minute." },
        { status: 502 }
      );
    }

    const form = buildCheckoutForm(cfg, {
      token: token.token,
      basketId,
      amount: task.budget,
      currency: task.currency,
      description: `KaamKaro escrow — ${task.title}`,
      customerMobile: payer?.phone || null,
      customerEmail: payer?.email || null,
      successUrl: `${origin}/pay/return?basket=${encodeURIComponent(basketId)}`,
      failureUrl: `${origin}/pay/return?basket=${encodeURIComponent(basketId)}&failed=1`,
      callbackUrl: `${origin}/api/payments/payfast/callback`,
    });

    return NextResponse.json({
      success: true,
      mode: "payfast",
      paymentId: id,
      basketId,
      // The browser POSTs this form to PayFast (hosted checkout needs a POST).
      checkout: { action: form.action, fields: form.fields },
      continueUrl: `/pay/${id}`,
      commissionAmount,
      netPayoutAmount,
    });
  } catch (err) {
    console.error("POST /api/tasks/[id]/pay failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
