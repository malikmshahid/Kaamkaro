import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import { guardRequest } from "@/lib/rateLimit";

/**
 * Every field is bounded. Unbounded strings here were a cheap way to bloat the
 * database (a 10MB "name") and to poison other people's pages with junk.
 */
const profileSchema = z
  .object({
    name: z.string().trim().min(2, "Name is too short").max(80, "Name is too long").optional(),
    city: z.string().trim().max(80).optional(),
    address: z.string().trim().max(300).optional(),
    gender: z.enum(["male", "female", "other"]).optional(),
    bio: z.string().trim().max(2000, "Keep your bio under 2000 characters").optional(),
    skills: z.string().trim().max(500).optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[+0-9][0-9\s-]{6,19}$/, "Enter a valid phone number")
      .optional()
      .or(z.literal("")),
    hourlyRate: z.number().min(0, "Hourly rate cannot be negative").max(1_000_000).nullable().optional(),
  })
  .strict();

// PATCH /api/profile — update basic profile fields. Does NOT handle email
// or password changes — those go through their own verified flows
// (/api/profile/email/request + /verify, /api/auth/reset-password).
export async function PATCH(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "profileAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const parsed = profileSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const body = parsed.data;

    const update: Record<string, unknown> = {};

    if (typeof body.name === "string") update.name = body.name;
    if (typeof body.city === "string") update.city = body.city || null;
    if (typeof body.address === "string") update.address = body.address || null;
    if (typeof body.gender === "string") update.gender = body.gender;
    if (typeof body.bio === "string") update.bio = body.bio || null;
    if (typeof body.skills === "string") update.skills = body.skills || null;
    if (typeof body.phone === "string") {
      const phone = body.phone.trim();
      if (phone) {
        const [taken] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.phone, phone))
          .limit(1);
        if (taken && taken.id !== session.userId) {
          return NextResponse.json(
            { error: "This phone number is already in use by another account" },
            { status: 409 }
          );
        }
      }
      update.phone = phone || null;
    }
    if (body.hourlyRate === null) update.hourlyRate = null;
    else if (typeof body.hourlyRate === "number") update.hourlyRate = body.hourlyRate;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await db.update(users).set(update).where(eq(users.id, session.userId));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/profile failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
