import { NextResponse } from "next/server";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, session.userId));

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("POST  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
