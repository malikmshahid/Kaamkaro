import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tools, users } from "@/db/schema";
import { eq, and, desc, or, ilike } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { CATEGORY_VALUES, LIMITS } from "@/lib/constants";
import { throttle, tooManyRequests } from "@/lib/rateLimit";

const createToolSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(LIMITS.toolTitle, `Title can't be longer than ${LIMITS.toolTitle} characters`),
  description: z
    .string()
    .trim()
    .min(10, "Please add a bit more detail")
    .max(LIMITS.toolDescription, `Description can't be longer than ${LIMITS.toolDescription} characters`),
  category: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => CATEGORY_VALUES.includes(v), {
      message: `Pick a category: ${CATEGORY_VALUES.join(", ")}`,
    }),
  price: z
    .number()
    .positive("Price must be a positive number")
    .max(5_000_000, "Price looks too large — please double-check it"),
  currency: z.string().optional(),
  deliveryDays: z.number().int().positive().default(1),
  city: z.string().optional(),
});

// GET /api/tools — browse active gigs, optional ?category= filter
export async function GET(req: NextRequest) {
  try {
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
        currency: tools.currency,
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

  } catch (err) {
    console.error("GET  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}

// POST /api/tools — a provider lists a new gig/tool
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });

    const toolLimit = await throttle("createTool", session.userId);
    if (!toolLimit.allowed) return tooManyRequests(toolLimit);

    const body = await req.json();
    const parsed = createToolSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { title, description, category, price, currency, deliveryDays, city } = parsed.data;
    const id = randomUUID();

    await db.insert(tools).values({
      id,
      providerId: session.userId,
      title,
      description,
      category,
      price,
      currency: currency || "PKR",
      deliveryDays,
      city: city || null,
      status: "active",
    });

    return NextResponse.json({ success: true, toolId: id });

  } catch (err) {
    console.error("POST  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
