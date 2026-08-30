import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { notify } from "@/lib/notify";

// POST /api/admin/users/[id]/verify
// Body: { verified: boolean }
// An admin reviews the ID a user submitted at signup (country + idType +
// idNumber) and marks it verified — this is a manual human decision, the
// platform never auto-verifies IDs.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id } = await params;
    const { verified } = await req.json();

    const found = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const user = found[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (!user.idNumber) {
      return NextResponse.json({ error: "This user hasn't submitted an ID yet" }, { status: 400 });
    }

    await db.update(users).set({ cnicVerified: !!verified }).where(eq(users.id, id));

    if (verified) {
      await notify(id, "id_verified", "Your identity has been verified ✅");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/users/[id]/verify failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
