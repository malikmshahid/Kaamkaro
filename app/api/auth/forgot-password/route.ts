import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, passwordResets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes, createHash, randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json().catch(() => ({ phone: "" }));
    if (!phone) {
      return NextResponse.json({ error: "Please enter your phone number" }, { status: 400 });
    }

    const found = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    const user = found[0];
    if (!user) {
      return NextResponse.json(
        { error: "No account found with that phone number" },
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

    // NOTE: There's no SMS gateway wired up yet (see README), so instead of
    // silently failing to deliver a reset code, we hand the token straight
    // back — same transparent "mock, will be real later" pattern used for
    // payments. Once an SMS provider is integrated, stop returning `resetToken`
    // here and text the link to the user's phone instead.
    return NextResponse.json({
      success: true,
      resetToken: rawToken,
      note: "SMS delivery isn't wired up yet — here's your reset link directly. Once an SMS gateway is added, this will be texted to your phone instead.",
    });

  } catch (err) {
    console.error("POST  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
