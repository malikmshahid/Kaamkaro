import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  getSessionUser,
  signToken,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { guardRequest, throttle, tooManyRequests } from "@/lib/rateLimit";
import { verifyTotp } from "@/lib/totp";
import { z } from "zod";

const disableSchema = z.object({
  password: z.string().min(1, "Enter your password"),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from your app"),
});

/**
 * POST /api/auth/2fa/disable
 *
 * Turning off the second factor is the juiciest thing an attacker with a stolen
 * cookie can do, so it needs the password *and* a live code. On success every
 * other session dies (tokenVersion bump) and this browser gets a fresh cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "taskAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const attempt = await throttle("totpAttempt", session.userId);
    if (!attempt.allowed) return tooManyRequests(attempt);

    const parsed = disableSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Password and code are required" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select({
        id: users.id,
        role: users.role,
        passwordHash: users.passwordHash,
        secret: users.totpSecret,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const passwordOk = await verifyPassword(parsed.data.password, user.passwordHash);
    const codeOk = user.secret ? verifyTotp(user.secret, parsed.data.code) : false;
    if (!passwordOk || !codeOk) {
      // Deliberately one message: don't reveal which half was wrong.
      return NextResponse.json(
        { error: "Password or code is incorrect." },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({
        totpEnabledAt: null,
        totpSecret: null,
        totpBackupCodes: sql`'{}'::text[]`,
        totpLastStep: null,
        tokenVersion: sql`${users.tokenVersion} + 1`,
      })
      .where(eq(users.id, user.id));

    const [after] = await db
      .select({ tv: users.tokenVersion })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    const token = signToken({ userId: user.id, role: user.role, tokenVersion: after.tv });
    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/auth/2fa/disable failed:", err);
    return NextResponse.json({ error: "Could not turn off two-factor." }, { status: 500 });
  }
}
