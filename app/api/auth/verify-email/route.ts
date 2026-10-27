import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { signToken, setSessionCookie } from "@/lib/auth";
import { sendSignupVerificationOtp } from "@/lib/email";
import crypto from "crypto";
import { guardRequest } from "@/lib/rateLimit";
import { z } from "zod";

const signupVerifySchema = z.object({
  userId: z.string().trim().min(8, "Missing verification details").max(64),
  otp: z.string().trim().regex(/^\d{4,8}$/, "The code should be 4–8 digits"),
});

const resendSchema = z.object({
  userId: z.string().trim().min(8, "Missing user id").max(64),
});


function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
const OTP_TTL_MINUTES = 10;

// POST /api/auth/verify-email — final step of signup when an email was
// provided. On success, grants the session cookie (login only happens here).
export async function POST(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "verifyEmail");
    if (limited) return limited;
    const parsed = signupVerifySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Missing verification details" },
        { status: 400 }
      );
    }
    const { userId, otp } = parsed.data;

    const otpHash = sha256Hex(otp);

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.emailOtpHash, otpHash),
          gt(users.emailOtpExpiresAt, new Date())
        )
      )
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "That code is incorrect or has expired" },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({ emailVerified: true, emailOtpHash: null, emailOtpExpiresAt: null })
      .where(eq(users.id, userId));

    const token = signToken({ userId: user.id, role: user.role, tokenVersion: user.tokenVersion });
    await setSessionCookie(token);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/auth/verify-email failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}

// POST /api/auth/verify-email/resend would be a natural addition, but to
// keep this endpoint set minimal we reuse the same route with an action
// flag instead of a new file.
export async function PUT(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "verifyEmail");
    if (limited) return limited;
    const parsed = resendSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }
    const userId = parsed.data.userId;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || !user.email || user.emailVerified) {
      return NextResponse.json({ error: "Nothing to verify" }, { status: 400 });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = sha256Hex(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    await db
      .update(users)
      .set({ emailOtpHash: otpHash, emailOtpExpiresAt: expiresAt })
      .where(eq(users.id, userId));

    const emailSent = await sendSignupVerificationOtp(user.email, otp);
    if (!emailSent) {
      return NextResponse.json(
        { error: "Email delivery isn't configured on this server yet." },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/auth/verify-email failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
