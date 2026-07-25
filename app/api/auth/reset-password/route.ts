import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { createHash } from "crypto";
import { hashPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { token, newPassword } = await req.json().catch(() => ({}));
  if (!token || !newPassword) {
    return NextResponse.json({ error: "Missing token or new password" }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const found = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.tokenHash, tokenHash),
        eq(passwordResets.used, false),
        gt(passwordResets.expiresAt, new Date())
      )
    )
    .limit(1);

  const resetRecord = found[0];
  if (!resetRecord) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired" },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, resetRecord.userId));
  await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.id, resetRecord.id));

  return NextResponse.json({ success: true });
}
