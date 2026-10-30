import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  signToken,
  setSessionCookie,
  verifyTwoFactorChallenge,
} from "@/lib/auth";
import { throttle, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { matchedTotpStep, hashBackupCode } from "@/lib/totp";
import { z } from "zod";

const verifySchema = z.object({
  challenge: z.string().min(10, "Start again from the login page"),
  code: z.string().trim().min(4, "Enter the code").max(16),
});

/**
 * POST /api/auth/2fa/verify
 *
 * Second leg of login. Takes the short-lived challenge issued after a correct
 * password plus either a 6-digit TOTP code or one recovery code, and only then
 * sets a session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    // 6 digits is a million-wide space: ten tries per quarter hour, per IP.
    const limit = await throttle("totpAttempt", clientIp(req));
    if (!limit.allowed) return tooManyRequests(limit);

    const parsed = verifySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Enter the code" },
        { status: 400 }
      );
    }

    const challenge = verifyTwoFactorChallenge(parsed.data.challenge);
    if (!challenge) {
      return NextResponse.json(
        { error: "This login attempt expired. Please log in again." },
        { status: 401 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, challenge.userId))
      .limit(1);
    if (!user || !user.totpEnabledAt || !user.totpSecret) {
      return NextResponse.json(
        { error: "Two-factor is not active on this account. Please log in again." },
        { status: 401 }
      );
    }

    const raw = parsed.data.code.replace(/\s/g, "");
    // Reject a code that has already been used: a 6-digit code is valid for its
    // whole 30-second window, which is long enough to replay a sniffed one.
    const step = /^\d{6}$/.test(raw) ? matchedTotpStep(user.totpSecret, raw) : null;
    const totpOk = step !== null && (user.totpLastStep === null || step > user.totpLastStep);

    let backupUsed = false;
    let remaining: string[] = user.totpBackupCodes || [];
    if (!totpOk) {
      const hash = hashBackupCode(raw);
      if (remaining.includes(hash)) {
        backupUsed = true;
        remaining = remaining.filter((h) => h !== hash);
        await db
          .update(users)
          .set({ totpBackupCodes: remaining })
          .where(eq(users.id, user.id));
      }
    }

    if (!totpOk && !backupUsed) {
      const replay = step !== null;
      return NextResponse.json(
        {
          error: replay
            ? "That code was already used. Wait for the next one in your app."
            : "That code is not valid. Check your authenticator app.",
        },
        { status: 401 }
      );
    }

    if (totpOk && step !== null) {
      await db.update(users).set({ totpLastStep: step }).where(eq(users.id, user.id));
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      usedBackupCode: backupUsed,
      backupCodesLeft: remaining.length,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("POST /api/auth/2fa/verify failed:", err);
    return NextResponse.json({ error: "Could not verify the code." }, { status: 500 });
  }
}
