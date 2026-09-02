import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { put } from "@vercel/blob";

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

    const ext = file.type.split("/")[1];
    const blob = await put(`profile-photos/${session.userId}-${Date.now()}.${ext}`, file, {
      access: "public",
    });

    await db.update(users).set({ photoUrl: blob.url }).where(eq(users.id, session.userId));

    return NextResponse.json({ success: true, photoUrl: blob.url });
  } catch (err) {
    console.error("POST /api/profile/photo failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
