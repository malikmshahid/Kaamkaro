import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, emailChangeRequests } from "@/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import crypto from "crypto";

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// POST /api/profile/email/verify — step 2 of changing an account's email.
// Body: { otp: string }. On success, writes the pending new email onto
// users.email and marks the request used.
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const body = await req.json().catch(() => null);
    const otp = typeof body?.otp === "string" ? body.otp.trim() : "";
    if (!otp) return NextResponse.json({ error: "Please enter the code" }, { status: 400 });

    const otpHash = sha256Hex(otp);

    const [record] = await db
      .select()
      .from(emailChangeRequests)
      .where(
        and(
          eq(emailChangeRequests.userId, session.userId),
          eq(emailChangeRequests.otpHash, otpHash),
          eq(emailChangeRequests.used, false),
          gt(emailChangeRequests.expiresAt, new Date())
        )
      )
      .orderBy(desc(emailChangeRequests.createdAt))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { error: "Code galat hai ya expire ho chuka hai" },
        { status: 400 }
      );
    }

    // Re-check uniqueness at verify time too, in case someone else claimed
    // the address in the window between request and verify.
    const [taken] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, record.newEmail))
      .limit(1);
    if (taken && taken.id !== session.userId) {
      return NextResponse.json(
        { error: "This email is already in use by another account" },
        { status: 409 }
      );
    }

    await db.update(users).set({ email: record.newEmail }).where(eq(users.id, session.userId));
    await db
      .update(emailChangeRequests)
      .set({ used: true })
      .where(eq(emailChangeRequests.id, record.id));

    return NextResponse.json({ success: true, email: record.newEmail });
  } catch (err) {
    console.error("POST /api/profile/email/verify failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
