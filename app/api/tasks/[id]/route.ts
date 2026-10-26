import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications, users, payments, reviews, agentListings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

// Fields that must never reach a stranger's browser: the private proof of
// work, internal user ids, and anything about the money.
const PRIVATE_TASK_FIELDS = ["proofUrl", "postedById", "assignedProviderId"] as const;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const found = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    const task = found[0];
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const session = await getSessionUser().catch(() => null);
    const isParticipant =
      !!session &&
      (task.postedById === session.userId || task.assignedProviderId === session.userId);
    const isAdmin = session?.role === "admin";

    // Anonymous visitors and unrelated users get a public-safe view only.
    if (!isParticipant && !isAdmin) {
      const publicTask: Record<string, unknown> = { ...task };
      for (const key of PRIVATE_TASK_FIELDS) delete publicTask[key];
      return NextResponse.json({
        task: publicTask,
        applications: [],
        payment: null,
        reviews: await db
          .select({
            id: reviews.id,
            rating: reviews.rating,
            comment: reviews.comment,
            createdAt: reviews.createdAt,
          })
          .from(reviews)
          .where(eq(reviews.taskId, id)),
      });
    }

    const apps = await db
      .select({
        id: applications.id,
        providerId: applications.providerId,
        applicantType: applications.applicantType,
        agentListingId: applications.agentListingId,
        message: applications.message,
        status: applications.status,
        providerName: users.name,
        providerRating: users.ratingAvg,
        providerRatingCount: users.ratingCount,
        providerVerified: users.cnicVerified,
        agentName: agentListings.name,
      })
      .from(applications)
      .leftJoin(users, eq(applications.providerId, users.id))
      .leftJoin(agentListings, eq(applications.agentListingId, agentListings.id))
      .where(eq(applications.taskId, id));

    const paymentRows = await db.select().from(payments).where(eq(payments.taskId, id)).limit(1);
    const reviewRows = await db.select().from(reviews).where(eq(reviews.taskId, id));

    return NextResponse.json({
      task,
      applications: apps,
      payment: paymentRows[0] || null,
      reviews: reviewRows,
    });

  } catch (err) {
    console.error("GET failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
