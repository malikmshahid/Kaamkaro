import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getPayFastConfig, fetchTransactionStatus } from "@/lib/payments/payfast";
import { fulfilEscrow, logPaymentEvent } from "@/lib/payments/escrow";

export const maxDuration = 30;

/**
 * GET /api/payments/payfast/status?paymentId=...
 *
 * Called by the "we're confirming your payment" screen after the shopper comes
 * back from PayFast. If the callback hasn't landed yet (common — the gateway
 * redirect and the server callback race each other), this actively pulls the
 * transaction status and funds the escrow itself.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const paymentId = new URL(req.url).searchParams.get("paymentId") || "";
    if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });

    const rows = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    const payment = rows[0];
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    let allowed =
      payment.payerId === session.userId || payment.payeeId === session.userId;
    if (!allowed) {
      const me = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
      allowed = me[0]?.role === "admin";
    }
    if (!allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const base = {
      paymentId: payment.id,
      taskId: payment.taskId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      basketId: payment.basketId,
    };

    if (payment.status !== "pending") return NextResponse.json(base);

    const cfg = getPayFastConfig();
    if (!cfg || !payment.providerTxnId) {
      return NextResponse.json({ ...base, note: "waiting for confirmation" });
    }

    const status = await fetchTransactionStatus(cfg, payment.providerTxnId);
    const amountsMatch =
      status.amount !== null && Math.abs(status.amount - Number(payment.amount)) < 0.01;

    if (status.paid && amountsMatch) {
      await fulfilEscrow({
        paymentId: payment.id,
        txnId: payment.providerTxnId,
        providerStatus: status.statusCode || "00",
        payload: status.raw,
        source: "gateway",
      });
      const after = await db.select().from(payments).where(eq(payments.id, payment.id)).limit(1);
      return NextResponse.json({ ...base, status: after[0]?.status || "held_in_escrow" });
    }

    await logPaymentEvent(payment.id, "status_check", status.message || "still pending", {
      statusCode: status.statusCode,
      amount: status.amount,
    });
    return NextResponse.json({ ...base, note: status.message || "waiting for confirmation" });
  } catch (err) {
    console.error("payment status failed:", err);
    return NextResponse.json({ error: "Could not check the payment right now" }, { status: 500 });
  }
}
