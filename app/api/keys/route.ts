import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { generateApiKey } from "@/lib/agentAuth";
import { randomUUID } from "crypto";

// GET /api/keys — list this user's keys (never returns the raw key again)
export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  const keys = await db
    .select({
      id: apiKeys.id,
      agentName: apiKeys.agentName,
      keyPrefix: apiKeys.keyPrefix,
      requestCount: apiKeys.requestCount,
      lastUsedAt: apiKeys.lastUsedAt,
      revoked: apiKeys.revoked,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.ownerId, session.userId));

  return NextResponse.json({ keys });
}

// POST /api/keys — generate a new key. The raw key is returned ONCE.
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  const { agentName } = await req.json().catch(() => ({ agentName: "My Agent" }));
  const { raw, hash, shownPrefix } = generateApiKey();
  const id = randomUUID();

  await db.insert(apiKeys).values({
    id,
    ownerId: session.userId,
    agentName: agentName || "My Agent",
    keyHash: hash,
    keyPrefix: shownPrefix,
  });

  return NextResponse.json({ success: true, key: raw, keyId: id });
}
