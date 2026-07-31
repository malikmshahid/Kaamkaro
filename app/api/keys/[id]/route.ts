import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    const { id } = await params;

    await db
      .update(apiKeys)
      .set({ revoked: true })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.ownerId, session.userId)));

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("DELETE failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
