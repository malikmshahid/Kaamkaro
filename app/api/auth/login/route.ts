import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your phone number or email"),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
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
    if (!user) {
      return NextResponse.json(
        { error: "No account found with that phone number or email" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, role: user.role });
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
