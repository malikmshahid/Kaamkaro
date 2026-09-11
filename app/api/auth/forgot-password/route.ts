import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { randomBytes, createHash, randomUUID } from "crypto";
import { sendEmail, passwordResetEmailHtml } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { identifier } = await req.json().catch(() => ({ identifier: "" }));
    if (!identifier) {
      return NextResponse.json(
        { error: "Please enter your phone number or email" },
        { status: 400 }
      );
    }

    const found = await db
      .select()
      .from(users)
      .where(or(eq(users.phone, identifier), eq(users.email, identifier)))
      .limit(1);
    const user = found[0];
    if (!user) {
      return NextResponse.json(
        { error: "No account found with that phone number or email" },
        { status: 404 }
      );
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

    // If this account has an email on file and Resend is configured, actually
    // deliver the reset link by email instead of exposing the raw token in
    // the API response.
    if (user.email) {
      const result = await sendEmail(
        user.email,
        "Reset your KaamKaro password",
        passwordResetEmailHtml(resetLink)
      );
      if (result.sent) {
        return NextResponse.json({
          success: true,
          delivered: "email",
          note: `A reset link was sent to ${user.email}.`,
        });
      }
    }

    // Fallback: no email on file, or email delivery isn't configured yet
    // (no RESEND_API_KEY) — hand back the token/link directly, same
    // transparent "mock, will be real later" pattern used elsewhere.
    return NextResponse.json({
      success: true,
      delivered: "shown",
      resetToken: rawToken,
      note: user.email
        ? "Email delivery isn't configured yet (RESEND_API_KEY missing) — here's your reset link directly."
        : "No email on file and SMS delivery isn't wired up yet — here's your reset link directly.",
    });
  } catch (err) {
    console.error("POST /api/auth/forgot-password failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
