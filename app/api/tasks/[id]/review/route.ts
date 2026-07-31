import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, reviews, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    const { id: taskId } = await params;
    const { rating, comment } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== "completed") {
      return NextResponse.json({ error: "Reviews can only be left on completed tasks" }, { status: 400 });
    }

    const isClient = task.postedById === session.userId;
    const isProvider = task.assignedProviderId === session.userId;
    if (!isClient && !isProvider) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const revieweeId = isClient ? task.assignedProviderId! : task.postedById;

    const existing = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.taskId, taskId), eq(reviews.reviewerId, session.userId)))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "You have already left a review" }, { status: 409 });
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

    await notify(revieweeId, "review_received", `You received a ${rating}-star review`, taskId);

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("POST failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
