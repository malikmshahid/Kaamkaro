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
    // Profile photos only. Task proof files are deliberately NOT reachable from
    // here — they have their own route that checks you are on that task, so a
    // guessed path can never leak somebody else's evidence photo.
    const allowedPrefixes = ["profile-photos/"];
    if (
      !file ||
      !allowedPrefixes.some((p) => file.startsWith(p)) ||
      file.includes("..") ||
      file.includes("//") ||
      !/^[\w./-]+$/.test(file)
    ) {
      return NextResponse.json({ error: "File not found" }, { status: 400 });
    }

    const blob = await get(file, { access: "private" });
    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Never echo an arbitrary content type back to the browser: an uploaded
    // file that claims to be text/html must not execute on our origin.
    const declared = (blob.blob.contentType || "").toLowerCase();
    const safeType = ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(declared)
      ? declared
      : "application/octet-stream";

    return new NextResponse(blob.stream, {
      headers: {
        "content-type": safeType,
        "content-disposition": safeType === "application/octet-stream" ? "attachment" : "inline",
        "cache-control": "private, max-age=3600",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err) {
    console.error("GET /api/files failed:", err);
    return NextResponse.json({ error: "Could not load this file" }, { status: 500 });
  }
}
