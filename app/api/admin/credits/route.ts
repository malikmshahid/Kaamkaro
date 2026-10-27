import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, walletCredits } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { creditWallet } from "@/lib/payments/escrow";
import { notify } from "@/lib/notify";
import { z } from "zod";
import { guardRequest } from "@/lib/rateLimit";

/**
 * POST /api/admin/credits — put money into someone's withdrawable balance
 * without a task (refund, goodwill, test credit).
 *
 * Admin only, bounded amount, mandatory reason, and the recipient is notified.
 * Every credit lands in wallet_credits with who created it and why.
 */
const creditSchema = z.object({
  identifier: z.string().trim().min(3, "Enter the user's phone number or email").max(254),
  amount: z
    .number()
    .positive("Amount must be more than zero")
    .max(500_000, "That is too large for a single credit"),
  reason: z.string().trim().min(3, "Say why this credit exists").max(200),
  currency: z.string().trim().max(8).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const rows = await db.select().from(walletCredits).orderBy(desc(walletCredits.createdAt)).limit(100);
  return NextResponse.json({ credits: rows });
}

export async function POST(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "adminAction");
    if (limited) return limited;
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const parsed = creditSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid credit" },
        { status: 400 }
      );
    }
    const { identifier, amount, reason, currency } = parsed.data;

    const found = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(or(eq(users.phone, identifier), eq(users.email, identifier.toLowerCase())))
      .limit(1);
    const user = found[0];
    if (!user) return NextResponse.json({ error: "No account with that phone or email" }, { status: 404 });

    const money = Math.round(amount * 100) / 100;
    const { id } = await creditWallet({
      userId: user.id,
      amount: money,
      currency: currency || "PKR",
      reason,
      adminId: admin.id,
    });

    await notify(
      user.id,
      "credit_received",
      `${currency || "PKR"} ${money.toLocaleString()} was added to your KaamKaro balance — ${reason}`,
      id
    );

    return NextResponse.json({ success: true, creditId: id, userId: user.id, amount: money });
  } catch (err) {
    console.error("POST /api/admin/credits failed:", err);
    return NextResponse.json({ error: "Could not create the credit" }, { status: 500 });
  }
}
