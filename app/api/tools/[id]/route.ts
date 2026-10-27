import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tools, users, tasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { kaamScore, daysSince } from "@/lib/kaamScore";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const found = await db
      .select({
        id: tools.id,
        providerId: tools.providerId,
        title: tools.title,
        description: tools.description,
        category: tools.category,
        price: tools.price,
        currency: tools.currency,
        deliveryDays: tools.deliveryDays,
        city: tools.city,
        status: tools.status,
        orderCount: tools.orderCount,
        createdAt: tools.createdAt,
        providerName: users.name,
        providerRating: users.ratingAvg,
        providerRatingCount: users.ratingCount,
        providerCity: users.city,
        providerVerified: users.cnicVerified,
        providerCreatedAt: users.createdAt,
        providerCompleted: sql<number>`(
          select count(*)::int from ${tasks}
          where ${tasks.assignedProviderId} = ${tools.providerId} and ${tasks.status} = 'completed'
        )`,
      })
      .from(tools)
      .leftJoin(users, eq(tools.providerId, users.id))
      .where(eq(tools.id, id))
      .limit(1);

    const tool = found[0];
    if (!tool) return NextResponse.json({ error: "Tool not found" }, { status: 404 });

    const score = kaamScore({
      completedTasks: Number(tool.providerCompleted || 0),
      ratingAvg: Number(tool.providerRating || 0),
      ratingCount: Number(tool.providerRatingCount || 0),
      verified: Boolean(tool.providerVerified),
      memberSinceDays: daysSince(tool.providerCreatedAt),
    });

    return NextResponse.json({ tool, kaamScore: score });

  } catch (err) {
    console.error("GET failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
