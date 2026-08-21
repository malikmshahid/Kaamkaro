import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { platformConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { z } from "zod";

const bodySchema = z.object({
  commissionRatePercent: z.number().min(0).max(50),
});

// GET /api/admin/settings/commission — current platform commission rate.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const rows = await db.select().from(platformConfig).where(eq(platformConfig.id, "default")).limit(1);
  return NextResponse.json({ commissionRatePercent: rows[0]?.commissionRatePercent ?? 10 });
}

// POST /api/admin/settings/commission — update the platform-wide commission
// rate. Only affects NEW payments going forward — existing escrow/released
// payments keep the rate that was in effect when they were created.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(platformConfig)
      .where(eq(platformConfig.id, "default"))
      .limit(1);

    if (existing[0]) {
      await db
        .update(platformConfig)
        .set({
          commissionRatePercent: parsed.data.commissionRatePercent,
          updatedAt: new Date(),
          updatedBy: admin.id,
        })
        .where(eq(platformConfig.id, "default"));
    } else {
      await db.insert(platformConfig).values({
        id: "default",
        commissionRatePercent: parsed.data.commissionRatePercent,
        updatedBy: admin.id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/settings/commission failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
