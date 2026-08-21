import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, platformConfig } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/revenue — platform commission dashboard: earned, pending
// (still in escrow), and the current commission rate, broken down by currency.
export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const earned = await db
      .select({
        currency: payments.currency,
        total: sql<number>`coalesce(sum(${payments.commissionAmount}), 0)::float`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(eq(payments.status, "released"))
      .groupBy(payments.currency);

    const pending = await db
      .select({
        currency: payments.currency,
        total: sql<number>`coalesce(sum(${payments.commissionAmount}), 0)::float`,
        count: sql<number>`count(*)::int`,
      })
      .from(payments)
      .where(eq(payments.status, "held_in_escrow"))
      .groupBy(payments.currency);

    const configRows = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.id, "default"))
      .limit(1);
    const commissionRatePercent = configRows[0]?.commissionRatePercent ?? 10;

    return NextResponse.json({
      commissionRatePercent,
      earnedByCurrency: earned,
      pendingByCurrency: pending,
    });
  } catch (err) {
    console.error("GET /api/admin/revenue failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
