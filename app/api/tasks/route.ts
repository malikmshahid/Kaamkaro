import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, desc, or, ilike, lte, isNotNull } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";

const MIN_LIFETIME_HOURS = 1;
const MAX_LIFETIME_DAYS = 90;

const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Please add a bit more detail"),
  category: z.string().min(2),
  budget: z.number().positive("Budget must be a positive number"),
  currency: z.string().optional(),
  city: z.string().optional(),
  // ISO date string from the "Active until" field on the post-task form —
  // the poster decides how long their own task stays open.
  expiresAt: z.string().datetime({ message: "Pick a valid active-until date" }),
});

// Flips any open task whose expiresAt has passed to "expired". Runs on every
// GET so the list is always accurate even with no cron running — the daily
// cron job (app/api/cron/expire-tasks) is just a tidiness backup.
async function expirePastDueTasks() {
  await db
    .update(tasks)
    .set({ status: "expired" })
    .where(and(eq(tasks.status, "open"), isNotNull(tasks.expiresAt), lte(tasks.expiresAt, new Date())));
}

// GET /api/tasks?category=&city=&status=open
export async function GET(req: NextRequest) {
  try {
    await expirePastDueTasks();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const city = searchParams.get("city");
    const status = searchParams.get("status") || "open";
    const q = searchParams.get("q");

    const conditions = [eq(tasks.status, status as "open")];
    if (category) conditions.push(eq(tasks.category, category));
    if (city) conditions.push(eq(tasks.city, city));
    if (q) {
      conditions.push(
        or(ilike(tasks.title, `%${q}%`), ilike(tasks.description, `%${q}%`))!
      );
    }

    const results = await db
      .select()
      .from(tasks)
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt));

    return NextResponse.json({ tasks: results });
  } catch (err) {
    console.error("GET /api/tasks failed:", err);
    return NextResponse.json({ error: "Could not load tasks right now." }, { status: 500 });
  }
}

// POST /api/tasks — create a new task (human client only for MVP; AI agents use /api/agent/tasks in Phase 3)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { title, description, category, budget, currency, city, expiresAt } = parsed.data;

    const expiresAtDate = new Date(expiresAt);
    const now = Date.now();
    const minAllowed = now + MIN_LIFETIME_HOURS * 60 * 60 * 1000;
    const maxAllowed = now + MAX_LIFETIME_DAYS * 24 * 60 * 60 * 1000;
    if (expiresAtDate.getTime() < minAllowed) {
      return NextResponse.json(
        { error: `Active-until must be at least ${MIN_LIFETIME_HOURS} hour(s) from now` },
        { status: 400 }
      );
    }
    if (expiresAtDate.getTime() > maxAllowed) {
      return NextResponse.json(
        { error: `Active-until can't be more than ${MAX_LIFETIME_DAYS} days from now` },
        { status: 400 }
      );
    }

    const id = randomUUID();

    await db.insert(tasks).values({
      id,
      postedById: session.userId,
      postedByType: "human",
      title,
      description,
      category,
      budget,
      currency: currency || "PKR",
      city: city || null,
      status: "open",
      expiresAt: expiresAtDate,
    });

    return NextResponse.json({ success: true, taskId: id });
  } catch (err) {
    console.error("POST /api/tasks failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
