import { put } from "@vercel/blob";
import { createHash } from "crypto";

/**
 * Pull a usable image URL out of whatever the provider typed/pasted.
 *
 * Providers habitually paste the link *plus* a sentence ("here's the draft:
 * https://... — 3 concepts attached"). Taking the whole string as the URL made
 * the AI verifier fail with "could not load the image", which looked like a
 * platform bug. We only need the first http(s) URL in the text.
 */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  const match = trimmed.match(/https?:\/\/[^\s<>"')]+/i);
  if (!match) return null;
  return match[0].replace(/[.,;:]+$/, "");
}

export const MAX_PROOF_BYTES = 5 * 1024 * 1024; // 5MB per file
export const MAX_PROOF_FILES = 5;
export const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export function isStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export type UploadedProof = { url: string; hash: string };

/**
 * Upload one proof file and return its public URL plus a sha256 of its bytes.
 * The hash feeds the duplicate-proof check in lib/proofIntegrity.ts.
 */
export async function uploadProofFile(file: File, userId: string): Promise<UploadedProof> {
  if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
    throw new Error("Proof must be a JPEG, PNG, WebP, GIF image or a PDF");
  }
  if (file.size > MAX_PROOF_BYTES) {
    throw new Error("Each proof file must be smaller than 5MB");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");
  const ext = (file.type.split("/")[1] || "bin").replace("jpeg", "jpg");
  const safeName = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const blob = await put(`proofs/${safeName}`, file, { access: "public" });
  return { url: blob.url, hash };
}
