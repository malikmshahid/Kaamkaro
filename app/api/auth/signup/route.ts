import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, signToken, setSessionCookie } from "@/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["client", "provider", "both"]).default("both"),
  city: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { name, phone, password, role, city } = parsed.data;

    const existing = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: "This phone number is already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const id = randomUUID();

    await db.insert(users).values({
      id,
      name,
      phone,
      passwordHash,
      role,
      city: city || null,
    });

    const token = signToken({ userId: id, role });
    await setSessionCookie(token);

    return NextResponse.json({ success: true, userId: id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error, please try again" }, { status: 500 });
  }
}
