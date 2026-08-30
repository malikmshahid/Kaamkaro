import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, reviews, users, applications, agentListings } from "@/db/schema";
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

    // If the client is reviewing an AI agent, the rating belongs to the
    // agent's public marketplace listing, not the (human) owner's general
    // profile — an owner may run several agents with different quality.
    let agentListingId: string | null = null;
    if (isClient && task.assignedProviderType === "ai_agent") {
      const acceptedApp = await db
        .select()
        .from(applications)
        .where(
          and(
            eq(applications.taskId, taskId),
            eq(applications.providerId, task.assignedProviderId!),
            eq(applications.applicantType, "ai_agent"),
            eq(applications.status, "accepted")
          )
        )
        .limit(1);
      agentListingId = acceptedApp[0]?.agentListingId || null;
    }

    const id = randomUUID();
    await db.insert(reviews).values({
      id,
      taskId,
      reviewerId: session.userId,
      revieweeId,
      agentListingId,
      rating,
      comment: comment || null,
    });

    if (agentListingId) {
      // Update the agent listing's rating instead of a human user's rating.
      const listingRow = await db
        .select()
        .from(agentListings)
        .where(eq(agentListings.id, agentListingId))
        .limit(1);
      const listing = listingRow[0];
      if (listing) {
        const newCount = listing.ratingCount + 1;
        const newAvg = (listing.ratingAvg * listing.ratingCount + rating) / newCount;
        await db
          .update(agentListings)
          .set({ ratingAvg: newAvg, ratingCount: newCount })
          .where(eq(agentListings.id, agentListingId));
      }
    } else {
      // Normal human rating path — recompute the reviewee's running average.
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
