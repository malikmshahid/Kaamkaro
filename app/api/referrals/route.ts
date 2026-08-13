import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const found = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
    const user = found[0];
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const [referredCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.referredBy, session.userId));

    return NextResponse.json({
      referralCode: user.referralCode,
      referredCount: referredCount.count,
    });
  } catch (err) {
    console.error("GET /api/referrals failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
