import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tools, users, tasks } from "@/db/schema";
import { eq, and, or, ilike, sql, lte, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/toolbox — the fixed-price side of the marketplace.
 *
 * A gig listing is only useful if you can answer three questions at a glance:
 * what does it cost, how fast is it, and is the person behind it any good.
 * This returns all three plus the facets the filter chips need, in one call.
 * Everything is bounded and parameterised.
 */

const SORTS = ["recommended", "newest", "price_low", "price_high", "fastest", "popular"] as const;
type Sort = (typeof SORTS)[number];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.slice(0, 40) || "";
    const q = searchParams.get("q")?.slice(0, 100) || "";
    const maxPrice = Math.max(0, Number(searchParams.get("maxPrice") || 0) || 0);
    const maxDays = Math.max(0, Number(searchParams.get("maxDays") || 0) || 0);
    const sortParam = (searchParams.get("sort") || "recommended") as Sort;
    const sort: Sort = SORTS.includes(sortParam) ? sortParam : "recommended";

    const where = [eq(tools.status, "active")];
    if (category) where.push(eq(tools.category, category));
    if (maxPrice > 0) where.push(lte(tools.price, maxPrice));
    if (maxDays > 0) where.push(lte(tools.deliveryDays, maxDays));
    if (q) where.push(or(ilike(tools.title, `%${q}%`), ilike(tools.description, `%${q}%`))!);

    const rows = await db
      .select({
        id: tools.id,
        title: tools.title,
        description: tools.description,
        category: tools.category,
        price: tools.price,
        currency: tools.currency,
        deliveryDays: tools.deliveryDays,
        city: tools.city,
        orderCount: tools.orderCount,
        createdAt: tools.createdAt,
        providerId: tools.providerId,
        providerName: users.name,
        providerCity: users.city,
        providerRating: users.ratingAvg,
        providerRatingCount: users.ratingCount,
        providerVerified: users.cnicVerified,
        providerSkills: users.skills,
        // How many jobs this provider has actually finished here — the most
        // credible signal on a listing, and the one competitors hide.
        providerCompleted: sql<number>`(
          select count(*)::int from ${tasks}
          where ${tasks.assignedProviderId} = ${tools.providerId} and ${tasks.status} = 'completed'
        )`,
      })
      .from(tools)
      .leftJoin(users, eq(users.id, tools.providerId))
      .where(and(...where))
      .orderBy(desc(tools.createdAt))
      .limit(200);

    // A light recommendation score: proven gigs first, then rating, then fresh.
    const scored = rows.map((t: (typeof rows)[number]) => {
      const rating = Number(t.providerRating || 0);
      const orders = Number(t.orderCount || 0);
      const completed = Number(t.providerCompleted || 0);
      const ageDays = (Date.now() - new Date(t.createdAt).getTime()) / 864e5;
      let score = 30 + Math.min(orders, 20) * 1.5 + Math.min(completed, 10) * 2;
      score += rating * 4 + Math.min(Number(t.providerRatingCount || 0), 10);
      if (t.providerVerified) score += 4;
      if (ageDays <= 14) score += 5;
      return { ...t, recommendScore: Math.round(Math.min(100, score)) };
    });

    type Row = (typeof scored)[number];
    const sorted = [...scored].sort((a: Row, b: Row) => {
      switch (sort) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "price_low":
          return a.price - b.price;
        case "price_high":
          return b.price - a.price;
        case "fastest":
          return a.deliveryDays - b.deliveryDays || a.price - b.price;
        case "popular":
          return b.orderCount - a.orderCount || b.recommendScore - a.recommendScore;
        default:
          return b.recommendScore - a.recommendScore;
      }
    });

    const facetRows = await db
      .select({ category: tools.category, count: sql<number>`count(*)::int` })
      .from(tools)
      .where(eq(tools.status, "active"))
      .groupBy(tools.category);

    const [statsRow] = await db
      .select({
        active: sql<number>`count(*)::int`,
        providers: sql<number>`count(distinct ${tools.providerId})::int`,
        orders: sql<number>`coalesce(sum(${tools.orderCount}), 0)::int`,
        fastest: sql<number>`coalesce(min(${tools.deliveryDays}), 0)::int`,
        cheapest: sql<number>`coalesce(min(${tools.price}), 0)::int`,
      })
      .from(tools)
      .where(eq(tools.status, "active"));

    const [mine] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tools)
      .where(and(eq(tools.providerId, (await getSessionUser())?.userId || ""), eq(tools.status, "active")));

    return NextResponse.json({
      tools: sorted,
      facets: {
        categories: facetRows.reduce(
          (acc: Record<string, number>, r: { category: string; count: number }) => {
            acc[r.category] = Number(r.count);
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      stats: {
        active: Number(statsRow?.active || 0),
        providers: Number(statsRow?.providers || 0),
        orders: Number(statsRow?.orders || 0),
        fastest: Number(statsRow?.fastest || 0),
        cheapest: Number(statsRow?.cheapest || 0),
        mine: Number(mine?.count || 0),
      },
    });
  } catch (err) {
    console.error("GET /api/toolbox failed:", err);
    return NextResponse.json({ error: "Could not load the Toolbox right now." }, { status: 500 });
  }
}
