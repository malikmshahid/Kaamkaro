import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth";
import { z } from "zod";

const loginSchema = z.object({
  phone: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Phone aur password required hain" }, { status: 400 });
    }
    const { phone, password } = parsed.data;

    const found = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    const user = found[0];
    if (!user) {
      return NextResponse.json({ error: "Account nahi mila, phone check karein" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Password ghalat hai" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, role: user.role });
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error, dobara koshish karein" }, { status: 500 });
  }
}
