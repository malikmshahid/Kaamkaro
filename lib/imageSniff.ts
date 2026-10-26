/**
 * Magic-byte sniffing for uploads.
 *
 * The browser-declared MIME type on a multipart upload is attacker controlled.
 * Before a file is written to blob storage we check the first bytes really do
 * belong to the image type we are about to tell the world it is.
 */
export function sniffImageType(head: Uint8Array): string | null {
  if (head.length < 12) return null;

  // JPEG: FF D8 FF
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => head[i] === b)) return "image/png";

  // WebP: "RIFF" .... "WEBP"
  const riff = [0x52, 0x49, 0x46, 0x46];
  const webp = [0x57, 0x45, 0x42, 0x50];
  if (riff.every((b, i) => head[i] === b) && webp.every((b, i) => head[8 + i] === b)) {
    return "image/webp";
  }

  // GIF87a / GIF89a
  if (head[0] === 0x47 && head[1] === 0x49 && head[2] === 0x46) return "image/gif";

  return null;
}
