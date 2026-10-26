import { db } from "@/db";
import { payments, tasks, paymentEvents } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { notify } from "@/lib/notify";
import { randomUUID } from "crypto";

/**
 * Escrow fulfilment — the one place where money is allowed to change state.
 *
 * Both the gateway callback and the manual admin confirmation call this, so
 * there is exactly one code path that can mark a task as funded. It is
 * idempotent: calling it twice (gateway retries, double clicks, replays) only
 * ever fulfils once.
 */

export async function logPaymentEvent(
  paymentId: string,
  kind: string,
  detail: string | null,
  payload?: unknown
) {
  try {
    await db.insert(paymentEvents).values({
      id: randomUUID(),
      paymentId,
      kind,
      detail,
      payload: (payload ?? null) as never,
    });
  } catch {
    // Audit logging must never break a payment.
  }
}

export type FulfilInput = {
  paymentId: string;
  txnId?: string | null;
  providerStatus?: string | null;
  payload?: unknown;
  /** "gateway" when PayFast told us, "admin" when a human confirmed. */
  source: "gateway" | "admin" | "auto";
};

export type FulfilResult = {
  ok: boolean;
  alreadyDone?: boolean;
  error?: string;
  taskId?: string;
};

/**
 * Move a payment from `pending` to `held_in_escrow`.
 * Only a pending payment can be fulfilled — released/refunded rows are final.
 */
export async function fulfilEscrow(input: FulfilInput): Promise<FulfilResult> {
  const rows = await db.select().from(payments).where(eq(payments.id, input.paymentId)).limit(1);
  const payment = rows[0];
  if (!payment) return { ok: false, error: "Payment not found" };

  if (payment.status === "held_in_escrow" || payment.status === "released") {
    return { ok: true, alreadyDone: true, taskId: payment.taskId };
  }
  if (payment.status !== "pending") {
    return { ok: false, error: `Payment is ${payment.status}, cannot fund` };
  }

  // Conditional update: if another request got here first, this matches 0 rows.
  const updated = await db
    .update(payments)
    .set({
      status: "held_in_escrow",
      paidAt: new Date(),
      providerTxnId: input.txnId ?? payment.providerTxnId,
      providerStatus: input.providerStatus ?? payment.providerStatus,
      providerRef: input.txnId ?? payment.providerRef,
      providerPayload: (input.payload ?? payment.providerPayload) as never,
    })
    .where(and(eq(payments.id, input.paymentId), eq(payments.status, "pending")))
    .returning({ id: payments.id });

  if (updated.length === 0) {
    return { ok: true, alreadyDone: true, taskId: payment.taskId };
  }

  await logPaymentEvent(
    payment.id,
    "funded",
    `Escrow funded via ${input.source}`,
    input.payload
  );

  const taskRows = await db.select().from(tasks).where(eq(tasks.id, payment.taskId)).limit(1);
  const task = taskRows[0];
  const amount = `${payment.currency} ${payment.amount.toLocaleString()}`;

  if (task?.assignedProviderId) {
    await notify(
      task.assignedProviderId,
      "escrow_funded",
      `Escrow is funded for "${task.title}" (${amount}). You can start work now.`,
      task.id
    );
  }
  if (task) {
    await notify(
      task.postedById,
      "escrow_funded",
      `Your payment of ${amount} is safely held in escrow for "${task.title}".`,
      task.id
    );
  }

  return { ok: true, taskId: payment.taskId };
}

/**
 * How much money a provider can withdraw right now:
 * net payouts of released payments that are not yet part of a payout batch.
 */
export async function availablePayoutBalance(userId: string): Promise<{
  amount: number;
  currency: string;
  paymentIds: string[];
}> {
  const rows = await db
    .select({
      id: payments.id,
      net: payments.netPayoutAmount,
      currency: payments.currency,
    })
    .from(payments)
    .where(
      and(
        eq(payments.payeeId, userId),
        eq(payments.status, "released"),
        isNull(payments.payoutId)
      )
    );

  const amount = rows.reduce((sum: number, r: { net: number }) => sum + Number(r.net || 0), 0);
  return {
    amount: Math.round(amount * 100) / 100,
    currency: rows[0]?.currency || "PKR",
    paymentIds: rows.map((r: { id: string }) => r.id),
  };
}

/** Mark released payments as included in a payout batch. */
export async function attachPaymentsToPayout(paymentIds: string[], payoutId: string) {
  if (paymentIds.length === 0) return;
  await db
    .update(payments)
    .set({ payoutId })
    .where(
      and(
        eq(payments.status, "released"),
        isNull(payments.payoutId),
        sql`${payments.id} = ANY(${sql.raw(`ARRAY[${paymentIds.map((id) => `'${id}'`).join(",")}]::text[]`)})`
      )
    );
}
