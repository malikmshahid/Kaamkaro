import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { guardRequest } from "@/lib/rateLimit";
import { generateTotpSecret, otpauthUri } from "@/lib/totp";
import QRCode from "qrcode";

/**
 * POST /api/auth/2fa/setup
 *
 * Starts enrollment: mints a secret, stores it (not yet enforced) and returns a
 * QR + the otpauth URI. Nothing changes about how the account logs in until
 * /enable succeeds.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "profileAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        phone: users.phone,
        totpEnabledAt: users.totpEnabledAt,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    if (user.totpEnabledAt) {
      return NextResponse.json(
        { error: "Two-factor is already on. Turn it off first to re-enroll." },
        { status: 409 }
      );
    }

    const secret = generateTotpSecret();
    await db.update(users).set({ totpSecret: secret }).where(eq(users.id, user.id));

    const account = user.email || user.phone || user.id;
    const uri = otpauthUri(secret, account);
    const qr = await QRCode.toDataURL(uri, { margin: 1, width: 260 });

    // The secret is returned once, on purpose: it is what the user types if
    // their camera doesn't work. It is not logged.
    return NextResponse.json({ secret, otpauth: uri, qr, account });
  } catch (err) {
    console.error("POST /api/auth/2fa/setup failed:", err);
    return NextResponse.json({ error: "Could not start setup." }, { status: 500 });
  }
}
