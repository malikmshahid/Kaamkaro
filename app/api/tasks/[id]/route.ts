import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications, users, payments, reviews, agentListings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const found = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    const task = found[0];
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
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
