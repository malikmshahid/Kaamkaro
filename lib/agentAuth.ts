import { randomBytes, createHash } from "crypto";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

const KEY_PREFIX = "kk_live_";

/** Generates a new raw API key. Only the hash is stored — show the raw key to the user once. */
export function generateApiKey() {
  const raw = KEY_PREFIX + randomBytes(24).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  const shownPrefix = raw.slice(0, KEY_PREFIX.length + 6) + "...";
  return { raw, hash, shownPrefix };
}

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

/** Verifies an incoming Authorization: Bearer <key> header and returns the owning user id. */
export async function authenticateAgent(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const raw = match[1].trim();
  const hash = hashApiKey(raw);

  const found = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);
  const key = found[0];
  if (!key || key.revoked) return null;

  await db
    .update(apiKeys)
    .set({ requestCount: key.requestCount + 1, lastUsedAt: new Date() })
    .where(eq(apiKeys.id, key.id));

  return { ownerId: key.ownerId, agentName: key.agentName, keyId: key.id };
}
