import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcryptjs"; // npm i bcryptjs — or your existing hashing lib

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { message: "Invalid request." },
        { status: 400 }
      );
    }

    const tokenHash = sha256Hex(token);

    const [record] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (
      !record ||
      record.used ||
      new Date(record.expiresAt).getTime() < Date.now()
    ) {
      // Generic — don't reveal whether token was invalid, used, or expired.
      return NextResponse.json(
        { message: "Reset link invalid ya expire ho chuka hai." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({ passwordHash } as any) // ⬅️ adjust field name to your schema
      .where(eq(users.id, record.userId));

    await db
      .update(passwordResetTokens)
      .set({ used: true })
      .where(eq(passwordResetTokens.id, record.id));

    return NextResponse.json(
      { message: "Password successfully update ho gaya." },
      { status: 200 }
    );
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json(
      { message: "Kuch masla ho gaya." },
      { status: 500 }
    );
  }
}
