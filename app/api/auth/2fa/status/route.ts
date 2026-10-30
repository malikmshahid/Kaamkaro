import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const [user] = await db
      .select({
        enabledAt: users.totpEnabledAt,
        backupCodes: users.totpBackupCodes,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    return NextResponse.json({
      enabled: !!user.enabledAt,
      enabledAt: user.enabledAt,
      backupCodesLeft: (user.backupCodes || []).length,
    });
  } catch (err) {
    console.error("GET /api/auth/2fa/status failed:", err);
    return NextResponse.json({ error: "Could not load security settings." }, { status: 500 });
  }
}
