import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser, signToken, setSessionCookie } from "@/lib/auth";
import { guardRequest, throttle, tooManyRequests } from "@/lib/rateLimit";
import { verifyTotp, generateBackupCodes, hashBackupCode } from "@/lib/totp";
import { z } from "zod";

const enableSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your app"),
});

/**
 * POST /api/auth/2fa/enable
 *
 * Proof-of-possession step: the user must produce one working code before the
 * account starts demanding codes at login (otherwise a bad QR scan locks them
 * out of their own account). Returns the recovery codes exactly once.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "taskAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const attempt = await throttle("totpAttempt", session.userId);
    if (!attempt.allowed) return tooManyRequests(attempt);

    const parsed = enableSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Enter the 6-digit code" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select({ id: users.id, role: users.role, secret: users.totpSecret, enabledAt: users.totpEnabledAt, tv: users.tokenVersion })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (user.enabledAt) {
      return NextResponse.json({ error: "Two-factor is already on." }, { status: 409 });
    }
    if (!user.secret) {
      return NextResponse.json(
        { error: "Start setup again — this account has no pending secret." },
        { status: 409 }
      );
    }

    if (!verifyTotp(user.secret, parsed.data.code)) {
      return NextResponse.json(
        { error: "That code didn't match. Check your app's clock and try the current code." },
        { status: 400 }
      );
    }

    const codes = generateBackupCodes();
    await db
      .update(users)
      .set({
        totpEnabledAt: new Date(),
        totpBackupCodes: codes.map(hashBackupCode),
        totpLastStep: null,
      })
      .where(eq(users.id, user.id));

    // Re-issue the session so this browser stays logged in, and so the cookie
    // carries the version we are about to keep.
    const token = signToken({ userId: user.id, role: user.role, tokenVersion: user.tv });
    await setSessionCookie(token);

    return NextResponse.json({ success: true, backupCodes: codes });
  } catch (err) {
    console.error("POST /api/auth/2fa/enable failed:", err);
    return NextResponse.json({ error: "Could not turn on two-factor." }, { status: 500 });
  }
}
