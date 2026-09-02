import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

// PATCH /api/profile — update basic profile fields. Does NOT handle email
// or password changes — those go through their own verified flows
// (/api/profile/email/request + /verify, /api/auth/reset-password).
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const update: Record<string, unknown> = {};

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      update.name = name;
    }
    if (typeof body.city === "string") update.city = body.city.trim() || null;
    if (typeof body.bio === "string") update.bio = body.bio.trim() || null;
    if (typeof body.skills === "string") update.skills = body.skills.trim() || null;
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
