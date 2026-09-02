import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db"; // ⬅️ adjust to your actual db import path
import { users, passwordResetTokens } from "@/db/schema"; // ⬅️ adjust to your actual schema path
import { eq } from "drizzle-orm";
import crypto, { randomUUID } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

const GENERIC_MESSAGE = {
  message: "If this account is registered, a reset link has been sent.",
};

const TOKEN_TTL_MINUTES = 30;

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    // Even invalid/malformed email gets the generic response.
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      // Raw token → sent via email only. Hash → stored in DB only.
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

      await db.insert(passwordResetTokens).values({
        id: randomUUID(),
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      const resetUrl = `${process.env.APP_URL}/reset-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (emailErr) {
        console.error("Failed to send reset email:", emailErr);
        // Do NOT leak this failure to the client — keep response generic.
      }
    } else {
      // Small artificial delay so response timing doesn't cheaply reveal
      // whether the email exists (not perfect, but removes the obvious gap).
      await new Promise((r) => setTimeout(r, 150));
    }

    // ✅ Same response body + status code in EVERY case.
    // ✅ Token/link NEVER appears here.
    return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json(GENERIC_MESSAGE, { status: 200 });
  }
}
