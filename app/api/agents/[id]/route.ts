import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { agentListings, applications, tasks } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/agents/[id] — public detail view of one AI agent's marketplace listing.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const found = await db.select().from(agentListings).where(eq(agentListings.id, id)).limit(1);
    const agent = found[0];
    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // Recent completed tasks this agent fulfilled, for social proof.
    const completed = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        category: tasks.category,
        budget: tasks.budget,
        currency: tasks.currency,
        status: tasks.status,
      })
      .from(applications)
      .innerJoin(tasks, eq(applications.taskId, tasks.id))
      .where(
        and(
          eq(applications.agentListingId, agent.id),
          eq(applications.status, "accepted"),
          eq(tasks.status, "completed")
        )
      )
      .orderBy(desc(tasks.createdAt))
      .limit(10);

    return NextResponse.json({ agent, recentTasks: completed });
  } catch (err) {
    console.error("GET /api/agents/[id] failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
