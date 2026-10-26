import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { get } from "@vercel/blob";

/**
 * GET /api/tasks/[id]/proof?f=proofs/xyz.jpg
 *
 * Proof uploads are stored in a private blob store, so this route is the only
 * way to see them: it checks that the caller is the task owner, the assigned
 * provider, or an admin, then streams the file straight through. Nothing in a
 * private proof photo is ever exposed publicly.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const { id: taskId } = await params;
    const file = new URL(req.url).searchParams.get("f");
    // Path safety: only ever read from our own proofs/ prefix.
    if (!file || !file.startsWith("proofs/") || file.includes("..")) {
      return NextResponse.json({ error: "File not found" }, { status: 400 });
    }

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    let allowed =
      task.postedById === session.userId || task.assignedProviderId === session.userId;
    if (!allowed) {
      const me = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
      allowed = me[0]?.role === "admin";
    }
    if (!allowed) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const blob = await get(file, { access: "private" });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const declared = (blob.blob.contentType || "").toLowerCase();
    const safeType = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"].includes(
      declared
    )
      ? declared
      : "application/octet-stream";

    return new NextResponse(blob.stream, {
      headers: {
        "content-type": safeType,
        "content-disposition": safeType === "application/pdf" ? "inline" : "inline",
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
        // Even if something slipped through, it can never run as a document on
        // our origin.
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    console.error("GET proof failed:", err);
    return NextResponse.json({ error: "Could not load this file" }, { status: 500 });
  }
}
