import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, reviews, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  const { id: taskId } = await params;
  const { rating, comment } = await req.json();

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating 1 se 5 ke darmiyan honi chahiye" }, { status: 400 });
  }

  const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = found[0];
  if (!task) return NextResponse.json({ error: "Task nahi mila" }, { status: 404 });
  if (task.status !== "completed") {
    return NextResponse.json({ error: "Review sirf completed task pe ho sakti hai" }, { status: 400 });
  }

  const isClient = task.postedById === session.userId;
  const isProvider = task.assignedProviderId === session.userId;
  if (!isClient && !isProvider) {
    return NextResponse.json({ error: "Access nahi hai" }, { status: 403 });
  }

  const revieweeId = isClient ? task.assignedProviderId! : task.postedById;

  const existing = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.taskId, taskId), eq(reviews.reviewerId, session.userId)))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Aap pehle hi review de chuke hain" }, { status: 409 });
  }

  const id = randomUUID();
  await db.insert(reviews).values({
    id,
    taskId,
    reviewerId: session.userId,
    revieweeId,
    rating,
    comment: comment || null,
  });

  // Recompute the reviewee's running average rating.
  const revieweeRow = await db.select().from(users).where(eq(users.id, revieweeId)).limit(1);
  const reviewee = revieweeRow[0];
  if (reviewee) {
    const newCount = reviewee.ratingCount + 1;
    const newAvg = (reviewee.ratingAvg * reviewee.ratingCount + rating) / newCount;
    await db
      .update(users)
      .set({ ratingAvg: newAvg, ratingCount: newCount })
      .where(eq(users.id, revieweeId));
  }

  return NextResponse.json({ success: true });
}
