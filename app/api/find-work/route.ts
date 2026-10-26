import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, users, applications } from "@/db/schema";
import { eq, and, or, ilike, sql, gte, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

/**
 * GET /api/find-work — the provider side of the marketplace.
 *
 * Returns open tasks enriched with what actually helps someone decide:
 *   · how many people already applied (competition is the #1 thing a provider
 *     wants to know and almost no marketplace shows it up front)
 *   · how long is left before it expires
 *   · who posted it (verified? rated?)
 *   · a personal match score, when the viewer has a profile to match against
 *
 * Everything is bounded and parameterised; sorting happens in memory after at
 * most 120 rows, so no unbounded scans.
 */

const SORTS = ["match", "newest", "budget", "ending", "competition"] as const;
type Sort = (typeof SORTS)[number];

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreTask(
  task: { title: string; description: string; category: string; city: string | null; budget: number; createdAt: Date; applicantCount: number },
  viewer: { skills: string | null; city: string | null; hourlyRate: number | null } | null
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 25; // everyone starts with a real chance

  if (viewer) {
    const skillWords = new Set(tokens(viewer.skills || ""));
    const taskWords = new Set([
      ...tokens(task.title),
      ...tokens(task.description),
      ...tokens(task.category),
    ]);
    if (skillWords.size > 0) {
      let hits = 0;
      skillWords.forEach((w) => {
        if (taskWords.has(w)) hits += 1;
      });
      const overlap = Math.min(1, hits / Math.min(4, skillWords.size));
      if (overlap > 0) {
        score += Math.round(overlap * 30);
        reasons.push("Matches your skills");
      }
    }

    if (viewer.city && task.city) {
      if (viewer.city.toLowerCase() === task.city.toLowerCase()) {
        score += 20;
        reasons.push("Same city");
      }
    } else if (!task.city) {
      score += 10;
      reasons.push("Can be done remotely");
    }

    if (viewer.hourlyRate && task.budget >= viewer.hourlyRate * 4) {
      score += 10;
      reasons.push("Pays well");
    }
  }

  const ageHours = (Date.now() - new Date(task.createdAt).getTime()) / 36e5;
  if (ageHours <= 6) {
    score += 15;
    reasons.push("Just posted");
  } else if (ageHours <= 24) {
    score += 10;
    reasons.push("Posted today");
  } else if (ageHours <= 72) {
    score += 5;
  }

  if (task.applicantCount === 0) {
    score += 10;
    reasons.push("No applicants yet");
  } else if (task.applicantCount === 1) {
    score += 7;
  } else if (task.applicantCount <= 3) {
    score += 4;
  } else {
    reasons.push(`${task.applicantCount} applicants already`);
  }

  return { score: Math.max(5, Math.min(100, score)), reasons: reasons.slice(0, 3) };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category")?.slice(0, 40) || "";
    const city = searchParams.get("city")?.slice(0, 60) || "";
    const q = searchParams.get("q")?.slice(0, 100) || "";
    const minBudget = Math.max(0, Number(searchParams.get("minBudget") || 0) || 0);
    const remoteOnly = searchParams.get("remote") === "1";
    const sortParam = (searchParams.get("sort") || "match") as Sort;
    const sort: Sort = SORTS.includes(sortParam) ? sortParam : "match";

    const session = await getSessionUser();
    let viewer: { skills: string | null; city: string | null; hourlyRate: number | null } | null = null;
    let myApplications = 0;
    if (session) {
      const me = await db
        .select({ skills: users.skills, city: users.city, hourlyRate: users.hourlyRate })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
      viewer = me[0] ? { skills: me[0].skills, city: me[0].city, hourlyRate: me[0].hourlyRate } : null;

      const mine = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.providerId, session.userId), eq(applications.status, "pending")));
      myApplications = mine.length;
    }

    const where = [eq(tasks.status, "open")];
    if (category) where.push(eq(tasks.category, category));
    if (city) where.push(eq(tasks.city, city));
    if (minBudget > 0) where.push(gte(tasks.budget, minBudget));
    if (remoteOnly) where.push(sql`(${tasks.city} IS NULL OR ${tasks.city} = '')`);
    if (q) where.push(or(ilike(tasks.title, `%${q}%`), ilike(tasks.description, `%${q}%`))!);

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        category: tasks.category,
        budget: tasks.budget,
        currency: tasks.currency,
        city: tasks.city,
        createdAt: tasks.createdAt,
        expiresAt: tasks.expiresAt,
        postedByType: tasks.postedByType,
        postedById: tasks.postedById,
        clientName: users.name,
        clientVerified: users.cnicVerified,
        clientRating: users.ratingAvg,
        clientRatingCount: users.ratingCount,
        applicantCount: sql<number>`(
          select count(*)::int from ${applications}
          where ${applications.taskId} = ${tasks.id} and ${applications.status} <> 'rejected'
        )`,
      })
      .from(tasks)
      .leftJoin(users, eq(users.id, tasks.postedById))
      .where(and(...where))
      .orderBy(desc(tasks.createdAt))
      .limit(120);

    const enriched = rows.map((t: (typeof rows)[number]) => {
      const { score, reasons } = scoreTask(
        { ...t, createdAt: new Date(t.createdAt) },
        viewer
      );
      return { ...t, matchScore: viewer ? score : null, matchReasons: viewer ? reasons : [] };
    });

    type Enriched = (typeof enriched)[number];
    const sorted = [...enriched].sort((a: Enriched, b: Enriched) => {
      switch (sort) {
        case "budget":
          return b.budget - a.budget;
        case "ending": {
          const at = a.expiresAt ? new Date(a.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
          const bt = b.expiresAt ? new Date(b.expiresAt).getTime() : Number.MAX_SAFE_INTEGER;
          return at - bt;
        }
        case "competition":
          return a.applicantCount - b.applicantCount;
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "match":
        default:
          return (b.matchScore ?? 0) - (a.matchScore ?? 0);
      }
    });

    // Facet counts so the filter chips can show "Delivery (12)".
    const facetRows = await db
      .select({ category: tasks.category, count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.status, "open"))
      .groupBy(tasks.category);

    const [statsRow] = await db
      .select({
        open: sql<number>`count(*)::int`,
        totalBudget: sql<number>`coalesce(sum(${tasks.budget}), 0)::int`,
        avgBudget: sql<number>`coalesce(round(avg(${tasks.budget})), 0)::int`,
        newToday: sql<number>`count(*) filter (where ${tasks.createdAt} > now() - interval '24 hours')::int`,
      })
      .from(tasks)
      .where(eq(tasks.status, "open"));

    return NextResponse.json({
      tasks: sorted,
      viewer: { signedIn: Boolean(session), hasProfile: Boolean(viewer?.skills || viewer?.city) },
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
        open: Number(statsRow?.open || 0),
        totalBudget: Number(statsRow?.totalBudget || 0),
        avgBudget: Number(statsRow?.avgBudget || 0),
        newToday: Number(statsRow?.newToday || 0),
        myApplications,
      },
    });
  } catch (err) {
    console.error("GET /api/find-work failed:", err);
    return NextResponse.json({ error: "Could not load work right now." }, { status: 500 });
  }
}
