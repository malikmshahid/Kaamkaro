import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import {
  verifyPassword,
  signToken,
  setSessionCookie,
  signTwoFactorChallenge,
} from "@/lib/auth";
import { throttle, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your phone number or email"),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    // Brute-force guard: 10 attempts per IP per 15 minutes. QA round 2 fired
    // ten wrong passwords and every single one came back 401 with no slowdown.
    const ipLimit = await throttle("login", clientIp(req));
    if (!ipLimit.allowed) return tooManyRequests(ipLimit);

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Phone/email and password are required" },
        { status: 400 }
      );
    }
    const { identifier, password } = parsed.data;

    // The identifier can be either a phone number or an email address —
    // we just check both columns and match whichever one it is.
    const found = await db
      .select()
      .from(users)
      .where(or(eq(users.phone, identifier), eq(users.email, identifier)))
      .limit(1);
    const user = found[0];

    // One message for "no such account" and "wrong password", and a real bcrypt
    // comparison even when the account is missing — otherwise the response time
    // tells an attacker which phone numbers are registered.
    const DUMMY_HASH = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.9Rn0YfQ0eB7jGK1zT0jWlT5lOaQ4J0K";
    const valid = await verifyPassword(password, user?.passwordHash || DUMMY_HASH);
    if (!user || !valid) {
      return NextResponse.json({ error: "Wrong phone/email or password" }, { status: 401 });
    }

    // Password is correct, but if the account has a second factor we stop here:
    // no cookie is set until a live code (or a recovery code) arrives at
    // /api/auth/2fa/verify. The challenge is a 5-minute signed ticket, not a session.
    if (user.totpEnabledAt) {
      return NextResponse.json({
        twoFactor: true,
        challenge: signTwoFactorChallenge({ userId: user.id, role: user.role }),
      });
    }

    const token = signToken({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion });
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return NextResponse.json({ error: "Server error, please try again" }, { status: 500 });
  }
}
