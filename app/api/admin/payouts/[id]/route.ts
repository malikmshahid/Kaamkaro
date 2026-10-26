import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payouts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { notify } from "@/lib/notify";
import { z } from "zod";

/** PATCH /api/admin/payouts/[id] — admin settles or rejects a withdrawal. */
const bodySchema = z.object({
  status: z.enum(["processing", "paid", "rejected"]),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id } = await params;
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const rows = await db.select().from(payouts).where(eq(payouts.id, id)).limit(1);
    const payout = rows[0];
    if (!payout) return NextResponse.json({ error: "Payout not found" }, { status: 404 });
    if (payout.status === "paid") {
      return NextResponse.json({ error: "This payout is already marked paid" }, { status: 409 });
    }

    await db
      .update(payouts)
      .set({
        status: parsed.data.status,
        reference: parsed.data.reference || payout.reference,
        note: parsed.data.note || payout.note,
        processedAt: parsed.data.status === "paid" ? new Date() : payout.processedAt,
      })
      .where(eq(payouts.id, id));

    const message =
      parsed.data.status === "paid"
        ? `Your payout of ${payout.currency} ${payout.amount.toLocaleString()} has been sent${
            parsed.data.reference ? ` (ref ${parsed.data.reference})` : ""
          }.`
        : parsed.data.status === "rejected"
          ? `Your payout request was rejected${parsed.data.note ? `: ${parsed.data.note}` : "."}`
          : `Your payout of ${payout.currency} ${payout.amount.toLocaleString()} is being processed.`;

    await notify(payout.userId, "payout_update", message, id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH payout failed:", err);
    return NextResponse.json({ error: "Could not update the payout" }, { status: 500 });
  }
}
