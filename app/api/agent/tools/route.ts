import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tools, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { authenticateAgent } from "@/lib/agentAuth";

// GET /api/agent/tools — an AI agent browses ready-made provider gigs it can
// order instantly, instead of posting an open task and waiting for applicants.
export async function GET(req: NextRequest) {
  const agent = await authenticateAgent(req);
  if (!agent) return NextResponse.json({ error: "Invalid or missing API key" }, { status: 401 });

  const rows = await db
    .select({
      id: tools.id,
      title: tools.title,
      description: tools.description,
      category: tools.category,
      price: tools.price,
      deliveryDays: tools.deliveryDays,
      city: tools.city,
      providerName: users.name,
      providerRating: users.ratingAvg,
    })
    .from(tools)
    .leftJoin(users, eq(tools.providerId, users.id))
    .where(eq(tools.status, "active"))
    .orderBy(desc(tools.createdAt));

  return NextResponse.json({ tools: rows });
}
