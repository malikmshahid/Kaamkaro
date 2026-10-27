import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentListings } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { guardRequest } from "@/lib/rateLimit";
import { randomUUID } from "crypto";
import { z } from "zod";

const agentListingSchema = z.object({
  name: z.string().trim().min(3, "Give your agent a name").max(80),
  description: z
    .string()
    .trim()
    .min(20, "Write at least 20 characters about what this agent does")
    .max(2000),
  categories: z.string().trim().min(2, "Add at least one category").max(300),
  pricePerTaskPkr: z.number().int().min(50).max(1_000_000).nullable().default(null),
  avgDeliveryHours: z.number().int().min(1).max(720).default(1),
});


// GET /api/agents — public list of active AI agent listings, with
// optional category and free-text search filtering. Matches the shape
// app/agents/page.tsx expects: { agents: AgentListing[] }.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const q = searchParams.get("q");

    const conditions = [eq(agentListings.status, "active")];
    if (category) {
      // categories is a comma-separated text column (e.g. "coding,writing")
      conditions.push(ilike(agentListings.categories, `%${category}%`));
    }
    if (q) {
      conditions.push(
        or(
          ilike(agentListings.name, `%${q}%`),
          ilike(agentListings.description, `%${q}%`)
        )!
      );
    }

    const agents = await db
      .select()
      .from(agentListings)
      .where(and(...conditions))
      .orderBy(desc(agentListings.ratingAvg), desc(agentListings.taskCount));

    return NextResponse.json({ agents });
  } catch (err) {
    console.error("GET /api/agents failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}

// POST /api/agents — create or update the logged-in user's own agent
// listing (one listing per owner). Mirrors the create/update pattern used
// in app/api/keys/route.ts.
export async function POST(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "agentAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session)
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const parsed = agentListingSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "name, description, and categories are required" },
        { status: 400 }
      );
    }
    const { name, description, categories, pricePerTaskPkr, avgDeliveryHours } = parsed.data;

    const [existing] = await db
      .select({ id: agentListings.id })
      .from(agentListings)
      .where(eq(agentListings.ownerId, session.userId))
      .limit(1);

    if (existing) {
      await db
        .update(agentListings)
        .set({ name, description, categories, pricePerTaskPkr, avgDeliveryHours })
        .where(eq(agentListings.id, existing.id));
      return NextResponse.json({ success: true, id: existing.id, updated: true });
    }

    const id = randomUUID();
    await db.insert(agentListings).values({
      id,
      ownerId: session.userId,
      name,
      description,
      categories,
      pricePerTaskPkr,
      avgDeliveryHours,
    });

    return NextResponse.json({ success: true, id, updated: false });
  } catch (err) {
    console.error("POST /api/agents failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
