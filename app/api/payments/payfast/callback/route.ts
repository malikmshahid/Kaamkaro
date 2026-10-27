import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getPayFastConfig,
  verifyCallbackSignature,
  fetchTransactionStatus,
} from "@/lib/payments/payfast";
import { fulfilEscrow, logPaymentEvent } from "@/lib/payments/escrow";
import { throttle, clientIp, tooManyRequests } from "@/lib/rateLimit";

export const maxDuration = 30;

/**
 * POST /api/payments/payfast/callback
 *
 * PayFast posts here after checkout (CHECKOUT_URL field). Three rules:
 *
 *  1. Signature must verify — otherwise the request is dropped and logged.
 *  2. We never trust the payload. We call PayFast's transaction-status API
 *     ourselves and compare basket id, amount and currency.
 *  3. Funding is idempotent, so repeated callbacks are harmless.
 *
 * The route always answers 200 with a short body: gateways retry on non-2xx
 * and a retry storm helps nobody.
 */
export async function POST(req: NextRequest) {
  const cfg = getPayFastConfig();
  if (!cfg) return NextResponse.json({ ok: false, reason: "gateway not configured" });

  // A public endpoint that talks to the gateway — cap it so nobody can use us
  // as a free load generator against PayFast.
  const limit = await throttle("gatewayCallback", clientIp(req));
  if (!limit.allowed) return tooManyRequests(limit);

  let payload: Record<string, string> = {};
  try {
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      // Gateways send strings; a JSON caller can send anything. Flatten every
      // value to a bounded string so no downstream hash/DB call sees an object.
      const raw = (await req.json()) as Record<string, unknown>;
      if (raw && typeof raw === "object") {
        for (const [k, v] of Object.entries(raw).slice(0, 60)) {
          if (typeof k !== "string" || k.length > 64) continue;
          payload[k] = typeof v === "string" ? v.slice(0, 512) : String(v ?? "").slice(0, 512);
        }
      }
    } else {
      const form = await req.formData();
      form.forEach((v, k) => {
        payload[k] = String(v);
      });
    }
  } catch {
    return NextResponse.json({ ok: false, reason: "unreadable payload" });
  }

  const basketId = payload.basket_id || payload.BASKET_ID || "";
  if (!basketId) return NextResponse.json({ ok: false, reason: "no basket" });

  const rows = await db.select().from(payments).where(eq(payments.basketId, basketId)).limit(1);
  const payment = rows[0];
  if (!payment) {
    console.warn("PayFast callback for unknown basket:", basketId);
    return NextResponse.json({ ok: false, reason: "unknown basket" });
  }

  await logPaymentEvent(payment.id, "callback", "Callback received", payload);

  const sig = verifyCallbackSignature(cfg, payload);
  if (!sig.valid) {
    await logPaymentEvent(payment.id, "rejected", "Callback signature mismatch", {
      provided: (payload.signature || payload.SIGNATURE || "").slice(0, 12),
      tried: "sha256(basket|key|merchant|err) and known variants",
    });
    return NextResponse.json({ ok: false, reason: "bad signature" });
  }

  // Already funded? Nothing to do.
  if (payment.status !== "pending") {
    return NextResponse.json({ ok: true, reason: `already ${payment.status}` });
  }

  const txnId =
    payload.transaction_id || payload.TRANSACTION_ID || payload.txn_id || payment.providerTxnId || "";

  // Authoritative verification with the gateway.
  const status = await fetchTransactionStatus(cfg, txnId);
  await logPaymentEvent(payment.id, "status_check", status.message || "status fetched", {
    statusCode: status.statusCode,
    amount: status.amount,
    currency: status.currency,
    basketId: status.basketId,
    paid: status.paid,
    raw: status.raw,
  });

  const amountsMatch =
    status.amount !== null && Math.abs(status.amount - Number(payment.amount)) < 0.01;
  const basketMatches = !status.basketId || status.basketId === payment.basketId;
  const currencyMatches =
    !status.currency || status.currency.toUpperCase() === payment.currency.toUpperCase();

  if (!status.paid || !amountsMatch || !basketMatches || !currencyMatches) {
    await db
      .update(payments)
      .set({ providerStatus: status.statusCode || "unverified", providerTxnId: txnId || null })
      .where(eq(payments.id, payment.id));
    await logPaymentEvent(
      payment.id,
      "rejected",
      `Verification failed (paid=${status.paid}, amount=${status.amount}, basket=${status.basketId}, currency=${status.currency})`
    );
    return NextResponse.json({ ok: false, reason: "verification failed" });
  }

  const result = await fulfilEscrow({
    paymentId: payment.id,
    txnId,
    providerStatus: status.statusCode || "00",
    payload: { callback: payload, status: status.raw },
    source: "gateway",
  });

  return NextResponse.json({ ok: result.ok, alreadyDone: result.alreadyDone ?? false });
}

/** Some deployments probe the callback URL with GET during onboarding. */
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "payfast-callback" });
}
