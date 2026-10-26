import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payouts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { availablePayoutBalance, attachPaymentsToPayout } from "@/lib/payments/escrow";
import { throttle, tooManyRequests } from "@/lib/rateLimit";
import { notify } from "@/lib/notify";
import { randomUUID } from "crypto";
import { z } from "zod";

/**
 * Provider withdrawals.
 *
 * Escrow release moves money to the provider's KaamKaro balance; this is how
 * it leaves the platform into a JazzCash / Easypaisa / bank account. Requests
 * are queued and settled by an admin, because PayFast's payout (disbursement)
 * product needs a separate approval we don't have yet — the ledger, the
 * balance and the audit trail are real, only the final bank leg is manual.
 */

const requestSchema = z.object({
  method: z.enum(["jazzcash", "easypaisa", "bank", "other"]),
  accountTitle: z.string().trim().min(3, "Enter the account holder name").max(80),
  accountNumber: z
    .string()
    .trim()
    .min(6, "Enter a valid account or wallet number")
    .max(40),
  bankName: z.string().trim().max(80).optional(),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  const [list, balance] = await Promise.all([
    db
      .select()
      .from(payouts)
      .where(eq(payouts.userId, session.userId))
      .orderBy(desc(payouts.createdAt))
      .limit(20),
    availablePayoutBalance(session.userId),
  ]);

  return NextResponse.json({ payouts: list, available: balance });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const limit = await throttle("payoutRequest", session.userId);
    if (!limit.allowed) return tooManyRequests(limit);

    const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payout details" },
        { status: 400 }
      );
    }

    const balance = await availablePayoutBalance(session.userId);
    if (balance.amount <= 0) {
      return NextResponse.json(
        { error: "You don't have any released earnings to withdraw yet" },
        { status: 400 }
      );
    }

    // One open request at a time keeps the ledger simple and honest.
    const open = await db
      .select()
      .from(payouts)
      .where(eq(payouts.userId, session.userId))
      .orderBy(desc(payouts.createdAt))
      .limit(1);
    if (open[0] && (open[0].status === "requested" || open[0].status === "processing")) {
      return NextResponse.json(
        { error: "You already have a payout in progress. Please wait for it to be settled." },
        { status: 409 }
      );
    }

    const id = randomUUID();
    await db.insert(payouts).values({
      id,
      userId: session.userId,
      amount: balance.amount,
      currency: balance.currency,
      method: parsed.data.method,
      accountTitle: parsed.data.accountTitle,
      accountNumber: parsed.data.accountNumber,
      bankName: parsed.data.bankName || null,
      status: "requested",
    });

    await attachPaymentsToPayout(balance.paymentIds, id);

    const admins = await db.select().from(users).where(eq(users.role, "admin")).limit(5);
    for (const admin of admins) {
      await notify(
        admin.id,
        "payout_requested",
        `Payout requested: ${balance.currency} ${balance.amount.toLocaleString()} via ${parsed.data.method}`,
        id
      );
    }

    return NextResponse.json({
      success: true,
      payoutId: id,
      amount: balance.amount,
      currency: balance.currency,
    });
  } catch (err) {
    console.error("POST /api/payouts failed:", err);
    return NextResponse.json({ error: "Could not create the payout request" }, { status: 500 });
  }
}
