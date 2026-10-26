import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { put } from "@vercel/blob";
import { throttle, tooManyRequests } from "@/lib/rateLimit";
import { sniffImageType } from "@/lib/imageSniff";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// POST /api/profile/photo — accepts a multipart/form-data upload with a
// "photo" file field, stores it in Vercel Blob, and saves the resulting
// URL onto users.photoUrl.
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const uploadLimit = await throttle("uploadFile", session.userId);
    if (!uploadLimit.allowed) return tooManyRequests(uploadLimit);

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "Photo storage isn't configured on this server yet. Please contact the site admin.",
        },
        { status: 503 }
      );
    }

    const formData = await req.formData().catch(() => null);
    const file = formData?.get("photo");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No photo was uploaded" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Please upload a JPEG, PNG, or WebP image" },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Photo must be smaller than 5MB" },
        { status: 400 }
      );
    }

    // Trust the bytes, not the label: a .png header on an HTML file would
    // otherwise be stored and later served back to a browser.
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (sniffImageType(head) !== file.type) {
      return NextResponse.json(
        { error: "That file doesn't look like a real image. Please upload a JPEG, PNG, or WebP." },
        { status: 400 }
      );
    }

    const ext = file.type.split("/")[1].replace("jpeg", "jpg");
    // The Blob store is private, so we keep the pathname and serve the image
    // through /api/files (which requires a login). See lib/proof.ts.
    const blob = await put(`profile-photos/${session.userId}-${Date.now()}.${ext}`, file, {
      access: "private",
      contentType: file.type,
      addRandomSuffix: false,
    });

    const servedFrom = `/api/files?f=${encodeURIComponent(blob.pathname)}`;
    await db.update(users).set({ photoUrl: servedFrom }).where(eq(users.id, session.userId));

    return NextResponse.json({ success: true, photoUrl: servedFrom });
  } catch (err) {
    console.error("POST /api/profile/photo failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
