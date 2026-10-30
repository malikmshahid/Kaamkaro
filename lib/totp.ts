/**
 * TOTP (RFC 6238) for authenticator apps — implemented on top of node:crypto
 * instead of pulling in a library, because the whole algorithm is ~60 lines and
 * every dependency in an auth path is another thing to audit.
 *
 * Secrets live in `users.totp_secret` (base32), codes are 6 digits, 30-second
 * steps, SHA-1 (what Google Authenticator / Authy / 1Password all default to),
 * and we accept one step of clock drift either side.
 */
import crypto from "crypto";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DIGITS = 6;
const PERIOD = 30;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = B32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** 20 random bytes = 160-bit secret, the RFC-recommended size. */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function totpCodeForStep(secret: string, step: number): string {
  const key = base32Decode(secret);
  const counter = Buffer.alloc(8);
  counter.writeUInt32BE(Math.floor(step / 0x100000000), 0);
  counter.writeUInt32BE(step % 0x100000000, 4);
  const hmac = crypto.createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function currentTotpCode(secret: string, at: number = Date.now()): string {
  return totpCodeForStep(secret, Math.floor(at / 1000 / PERIOD));
}

/**
 * Verify a code with ±1 step of drift. Comparison is constant-time so a wrong
 * code cannot be narrowed down by response timing.
 */
/** The time-step a given code belongs to (for replay protection). */
export function matchedTotpStep(
  secret: string,
  code: string,
  at: number = Date.now()
): number | null {
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return null;
  const step = Math.floor(at / 1000 / PERIOD);
  for (const drift of [0, -1, 1]) {
    const expected = totpCodeForStep(secret, step + drift);
    const a = Buffer.from(expected);
    const b = Buffer.from(digits);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return step + drift;
  }
  return null;
}

export function verifyTotp(secret: string, code: string, at: number = Date.now()): boolean {
  const digits = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(digits)) return false;
  const step = Math.floor(at / 1000 / PERIOD);
  for (const drift of [0, -1, 1]) {
    const expected = totpCodeForStep(secret, step + drift);
    const a = Buffer.from(expected);
    const b = Buffer.from(digits);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** otpauth:// URI that authenticator apps accept as a QR payload. */
export function otpauthUri(secret: string, account: string, issuer = "KaamKaro"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Ten single-use recovery codes, formatted as xxxx-xxxx. */
export function generateBackupCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex"); // 10 chars, 40 bits
    codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
  }
  return codes;
}

export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}
