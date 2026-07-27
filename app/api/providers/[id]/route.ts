import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, tools, reviews, tasks } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const found = await db
    .select({
      id: users.id,
      name: users.name,
      city: users.city,
      bio: users.bio,
      skills: users.skills,
      ratingAvg: users.ratingAvg,
      ratingCount: users.ratingCount,
      cnicVerified: users.cnicVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const provider = found[0];
  if (!provider) return NextResponse.json({ error: "Provider not found" }, { status: 404 });

  const activeTools = await db
    .select({
      id: tools.id,
      title: tools.title,
      description: tools.description,
      category: tools.category,
      price: tools.price,
      deliveryDays: tools.deliveryDays,
      orderCount: tools.orderCount,
    })
    .from(tools)
    .where(and(eq(tools.providerId, id), eq(tools.status, "active")))
    .orderBy(desc(tools.createdAt));

  const recentReviews = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      reviewerName: users.name,
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.reviewerId, users.id))
    .where(eq(reviews.revieweeId, id))
    .orderBy(desc(reviews.createdAt))
    .limit(10);

  const [completedStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(and(eq(tasks.assignedProviderId, id), eq(tasks.status, "completed")));

  return NextResponse.json({
    provider,
    tools: activeTools,
    reviews: recentReviews,
    completedCount: completedStats.count,
  });
}
