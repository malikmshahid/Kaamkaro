import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { get } from "@vercel/blob";

/**
 * GET /api/files?f=profile-photos/xyz.jpg
 *
 * Authenticated read-through for files in the private blob store (profile
 * photos today). Task proof files have their own stricter route
 * (/api/tasks/[id]/proof) that also checks you're on that task.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const file = new URL(req.url).searchParams.get("f");
    // Only our own two prefixes, never arbitrary paths.
    const allowedPrefixes = ["profile-photos/", "proofs/"];
    if (!file || !allowedPrefixes.some((p) => file.startsWith(p)) || file.includes("..")) {
      return NextResponse.json({ error: "File not found" }, { status: 400 });
    }

    const blob = await get(file, { access: "private" });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return new NextResponse(blob.stream, {
      headers: {
        "content-type": blob.blob.contentType || "application/octet-stream",
        "cache-control": "private, max-age=3600",
        "content-disposition": "inline",
      },
    });
  } catch (err) {
    console.error("GET /api/files failed:", err);
    return NextResponse.json({ error: "Could not load this file" }, { status: 500 });
  }
}
