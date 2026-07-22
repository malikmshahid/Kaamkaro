import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const found = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const user = found[0];
  if (!user) return NextResponse.json({ user: null });

  const { passwordHash, ...safeUser } = user;
  return NextResponse.json({ user: safeUser });
}
