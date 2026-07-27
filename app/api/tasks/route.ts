import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";

const createTaskSchema = z.object({
  title: z.string().min(3, "Title kam se kam 3 haroof ka ho"),
  description: z.string().min(10, "Description thori tafseel se likhein"),
  category: z.string().min(2),
  budget: z.number().positive("Budget sahi number ho"),
  city: z.string().optional(),
});

// GET /api/tasks?category=&city=&status=open
export async function GET(req: NextRequest) {
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
}

// POST /api/tasks — create a new task (human client only for MVP; AI agents use /api/agent/tasks in Phase 3)
export async function POST(req: NextRequest) {
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

  const { title, description, category, budget, city } = parsed.data;
  const id = randomUUID();

  await db.insert(tasks).values({
    id,
    postedById: session.userId,
    postedByType: "human",
    title,
    description,
    category,
    budget,
    city: city || null,
    status: "open",
  });

  return NextResponse.json({ success: true, taskId: id });
}
