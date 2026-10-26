import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { generateApiKey } from "@/lib/agentAuth";
import { randomUUID } from "crypto";
import { and } from "drizzle-orm";
import { z } from "zod";

const MAX_KEYS_PER_USER = 10;
const keySchema = z.object({
  agentName: z.string().trim().min(2, "Give your agent a name").max(60).default("My Agent"),
});

// GET /api/keys — list this user's keys (never returns the raw key again)
export async function GET() {
  try {
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

  } catch (err) {
    console.error("GET  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}

// POST /api/keys — generate a new key. The raw key is returned ONCE.
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const parsed = keySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid agent name" },
        { status: 400 }
      );
    }
    const { agentName } = parsed.data;

    const active = await db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(and(eq(apiKeys.ownerId, session.userId), eq(apiKeys.revoked, false)));
    if (active.length >= MAX_KEYS_PER_USER) {
      return NextResponse.json(
        { error: `You can have ${MAX_KEYS_PER_USER} active keys. Revoke one first.` },
        { status: 400 }
      );
    }

    const { raw, hash, shownPrefix } = generateApiKey();
    const id = randomUUID();

    await db.insert(apiKeys).values({
      id,
      ownerId: session.userId,
      agentName,
      keyHash: hash,
      keyPrefix: shownPrefix,
    });

    return NextResponse.json({ success: true, key: raw, keyId: id });

  } catch (err) {
    console.error("POST  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
