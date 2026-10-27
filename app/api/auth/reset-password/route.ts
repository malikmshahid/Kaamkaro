import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { createHash } from "crypto";
import { hashPassword, bumpTokenVersion, clearSessionCookie } from "@/lib/auth";
import { throttle, clientIp, tooManyRequests } from "@/lib/rateLimit";
import { z } from "zod";

const resetSchema = z.object({
  token: z.string().trim().min(10, "This reset link is not valid").max(512),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(200, "That password is too long"),
});


const ipKey = (req: NextRequest) => clientIp(req);

export async function POST(req: NextRequest) {
  try {
    const limit = await throttle("forgotPassword", ipKey(req));
    if (!limit.allowed) return tooManyRequests(limit);

    const parsed = resetSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Missing token or new password" },
        { status: 400 }
      );
    }
    const { token, newPassword } = parsed.data;
    if (newPassword.length > 200) {
      return NextResponse.json({ error: "That password is too long" }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");

    const found = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, tokenHash),
          eq(passwordResets.used, false),
          gt(passwordResets.expiresAt, new Date())
        )
      )
      .limit(1);

    const resetRecord = found[0];
    if (!resetRecord) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, resetRecord.userId));

    // Burn every outstanding link for this account: one reset, one clean slate.
    await db.update(passwordResets).set({ used: true }).where(eq(passwordResets.userId, resetRecord.userId));

    // A password reset has to mean "whoever else had this account is out".
    // Bumping the token version invalidates every cookie signed before now,
    // and we drop the cookie in this browser too so the login page is honest.
    await bumpTokenVersion(resetRecord.userId);
    await clearSessionCookie();

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("POST  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
