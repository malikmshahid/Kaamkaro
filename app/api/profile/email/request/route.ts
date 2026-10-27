import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, emailChangeRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { guardRequest } from "@/lib/rateLimit";
import { sendEmailChangeOtp } from "@/lib/email";
import crypto, { randomUUID } from "crypto";
import { z } from "zod";

const emailRequestSchema = z.object({
  newEmail: z
    .string()
    .trim()
    .max(254, "That email is too long")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Please enter a valid email"),
});


const OTP_TTL_MINUTES = 10;

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// POST /api/profile/email/request — step 1 of changing an account's email.
// Sends a 6-digit OTP to the NEW address; the address is only written to
// users.email once that code is verified via /api/profile/email/verify.
export async function POST(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "profileAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const parsed = emailRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Please enter a valid email" },
        { status: 400 }
      );
    }
    const newEmail = parsed.data.newEmail.toLowerCase();

    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, newEmail))
      .limit(1);
    if (taken) {
      return NextResponse.json(
        { error: "This email is already in use by another account" },
        { status: 409 }
      );
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
    const otpHash = sha256Hex(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await db.insert(emailChangeRequests).values({
      id: randomUUID(),
      userId: session.userId,
      newEmail,
      otpHash,
      expiresAt,
    });

    const emailSent = await sendEmailChangeOtp(newEmail, otp);

    if (!emailSent) {
      return NextResponse.json(
        {
          error:
            "Email delivery isn't configured on this server yet, so the code couldn't be sent. Please contact the site admin.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A verification code was sent to ${newEmail}. Enter it within 10 minutes.`,
    });
  } catch (err) {
    console.error("POST /api/profile/email/request failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
