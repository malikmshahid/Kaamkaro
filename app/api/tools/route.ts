import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tools, users } from "@/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";

const createToolSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Please add a bit more detail"),
  category: z.string().min(2),
  price: z.number().positive("Price must be a positive number"),
  deliveryDays: z.number().int().positive().default(1),
  city: z.string().optional(),
});

// GET /api/tools — browse active gigs, optional ?category= filter
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q");

  const conditions = [eq(tools.status, "active")];
  if (category) conditions.push(eq(tools.category, category));
  if (q) {
    conditions.push(
      or(ilike(tools.title, `%${q}%`), ilike(tools.description, `%${q}%`))!
    );
  }

  const rows = await db
    .select({
      id: tools.id,
      providerId: tools.providerId,
      title: tools.title,
      description: tools.description,
      category: tools.category,
      price: tools.price,
      deliveryDays: tools.deliveryDays,
      city: tools.city,
      orderCount: tools.orderCount,
      createdAt: tools.createdAt,
      providerName: users.name,
      providerRating: users.ratingAvg,
      providerRatingCount: users.ratingCount,
    })
    .from(tools)
    .leftJoin(users, eq(tools.providerId, users.id))
    .where(and(...conditions))
    .orderBy(desc(tools.createdAt));

  return NextResponse.json({ tools: rows });
}

// POST /api/tools — a provider lists a new gig/tool
export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

  const body = await req.json();
  const parsed = createToolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { title, description, category, price, deliveryDays, city } = parsed.data;
  const id = randomUUID();

  await db.insert(tools).values({
    id,
    providerId: session.userId,
    title,
    description,
    category,
    price,
    deliveryDays,
    city: city || null,
    status: "active",
  });

  return NextResponse.json({ success: true, toolId: id });
}
