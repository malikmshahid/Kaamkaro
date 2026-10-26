import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { and, eq, or, gte } from "drizzle-orm";
import { randomBytes, createHash, randomUUID } from "crypto";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";

// Always the same answer, whether or not the account exists. Anything else
// lets a stranger enumerate which phone numbers / emails are registered.
const GENERIC_RESPONSE = {
  success: true,
  message: "If an account exists for that phone number or email, we've sent a reset link. Check your inbox (and spam).",
};

// Max 3 reset links per account per hour — stops a single stranger from
// spamming somebody's inbox and burning the email quota.
const MAX_PER_HOUR = 3;

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json().catch(() => ({ identifier: "" }));
    if (!identifier || typeof identifier !== "string") {
      return NextResponse.json(
        { error: "Please enter your phone number or email" },
        { status: 400 }
      );
    }

    const found = await db
      .select()
      .from(users)
      .where(or(eq(users.phone, identifier.trim()), eq(users.email, identifier.trim().toLowerCase())))
      .limit(1);
    const user = found[0];

    // Unknown account → same generic answer, no work done.
    if (!user) {
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await db
      .select({ id: passwordResets.id })
      .from(passwordResets)
      .where(and(eq(passwordResets.userId, user.id), gte(passwordResets.createdAt, oneHourAgo)));

    if (recent.length >= MAX_PER_HOUR) {
      console.warn(`forgot-password rate limit hit for user ${user.id}`);
      return NextResponse.json(GENERIC_RESPONSE);
    }

    const rawToken = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db.insert(passwordResets).values({
      id: randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
    const resetLink = `${siteUrl}/reset-password?token=${rawToken}`;

    let emailDelivered = false;
    if (user.email) {
      const result = await sendEmail(
        user.email,
        "Reset your KaamKaro password",
        passwordResetEmailHtml(resetLink)
      );
      emailDelivered = result.sent;
      if (!result.sent) {
        // Never surface this to the caller — it's an internal ops problem.
        console.error("Password reset email failed:", result.error);
      }
    } else {
      console.error(`Password reset requested for user ${user.id} with no email on file — SMS is not wired up yet.`);
    }

    // DEV ONLY escape hatch: lets you test the flow locally without an email
    // provider. Impossible to switch on in production, even by accident.
    const devTokenEcho =
      process.env.RESET_TOKEN_IN_RESPONSE === "true" && process.env.NODE_ENV !== "production";

    return NextResponse.json({
      ...GENERIC_RESPONSE,
      ...(devTokenEcho ? { devResetToken: rawToken, devNote: "dev-only token echo" } : {}),
      ...(process.env.NODE_ENV === "production" && !emailDelivered && !user.email
        ? { hint: "This account has no email on file — contact support to reset your password." }
        : {}),
    });
  } catch (err) {
    console.error("POST /api/auth/forgot-password failed:", err);
    // Same shape as the happy path so errors can't be used to probe accounts.
    return NextResponse.json(GENERIC_RESPONSE);
  }
}
