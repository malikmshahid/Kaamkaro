import { NextResponse } from "next/server";
import { db } from "@/db";
import { payouts, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";

/** GET /api/admin/payouts — the withdrawal queue, newest first. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const rows = await db
    .select({
      id: payouts.id,
      userId: payouts.userId,
      userName: users.name,
      userPhone: users.phone,
      amount: payouts.amount,
      currency: payouts.currency,
      method: payouts.method,
      accountTitle: payouts.accountTitle,
      accountNumber: payouts.accountNumber,
      bankName: payouts.bankName,
      status: payouts.status,
      reference: payouts.reference,
      note: payouts.note,
      createdAt: payouts.createdAt,
      processedAt: payouts.processedAt,
    })
    .from(payouts)
    .leftJoin(users, eq(payouts.userId, users.id))
    .orderBy(desc(payouts.createdAt))
    .limit(100);

  return NextResponse.json({ payouts: rows });
}
