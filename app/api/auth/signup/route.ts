import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { hashPassword, signToken, setSessionCookie } from "@/lib/auth";
import { validateIdNumber, COUNTRIES } from "@/lib/idValidation";
import { z } from "zod";
import { randomUUID } from "crypto";

const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    phone: z.string().min(10, "Please enter a valid phone number").optional().or(z.literal("")),
    email: z.string().email("Please enter a valid email address").optional().or(z.literal("")),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["client", "provider", "both"]).default("both"),
    city: z.string().optional(),
    country: z.enum(COUNTRIES).optional(),
    idType: z.enum(["national_id", "passport", "driver_license", "other"]).optional(),
    idNumber: z.string().optional(),
  })
  .refine((data) => (data.phone && data.phone.length > 0) || (data.email && data.email.length > 0), {
    message: "Please provide a phone number or an email address",
    path: ["phone"],
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
    const { name, phone, email, password, role, city, country, idType, idNumber } = parsed.data;

    // Uniqueness checks — only for whichever identifiers were actually provided.
    const identifierConditions = [];
    if (phone) identifierConditions.push(eq(users.phone, phone));
    if (email) identifierConditions.push(eq(users.email, email));
    if (identifierConditions.length > 0) {
      const existing = await db
        .select()
        .from(users)
        .where(or(...identifierConditions))
        .limit(1);
      if (existing.length > 0) {
        return NextResponse.json(
          { error: "An account with this phone number or email already exists" },
          { status: 409 }
        );
      }
    }

    // ID number is for identity verification only — never used as a login credential.
    if (country && idNumber) {
      const idCheck = validateIdNumber(country, idNumber);
      if (!idCheck.valid) {
        return NextResponse.json({ error: idCheck.message }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(password);
    const id = randomUUID();

    await db.insert(users).values({
      id,
      name,
      phone: phone || null,
      email: email || null,
      passwordHash,
      role,
      city: city || null,
      country: country || null,
      idType: idType || null,
      idNumber: idNumber || null,
    });

    const token = signToken({ userId: id, role });
    await setSessionCookie(token);

    return NextResponse.json({ success: true, userId: id });
  } catch (err) {
    console.error("POST /api/auth/signup failed:", err);
    return NextResponse.json({ error: "Server error, please try again" }, { status: 500 });
  }
}
