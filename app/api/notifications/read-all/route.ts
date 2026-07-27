import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function POST() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.userId, session.userId));

  return NextResponse.json({ success: true });
}
