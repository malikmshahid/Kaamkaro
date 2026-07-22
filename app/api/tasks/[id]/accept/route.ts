import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  }
  const { id: taskId } = await params;
  const { applicationId } = await req.json();

  const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = found[0];
  if (!task) return NextResponse.json({ error: "Task nahi mila" }, { status: 404 });
  if (task.postedById !== session.userId) {
    return NextResponse.json({ error: "Sirf task owner accept kar sakta hai" }, { status: 403 });
  }

  const appFound = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  const application = appFound[0];
  if (!application || application.taskId !== taskId) {
    return NextResponse.json({ error: "Application nahi mili" }, { status: 404 });
  }

  await db
    .update(applications)
    .set({ status: "accepted" })
    .where(eq(applications.id, applicationId));

  await db
    .update(applications)
    .set({ status: "rejected" })
    .where(and(eq(applications.taskId, taskId), eq(applications.status, "pending")));

  await db
    .update(tasks)
    .set({ status: "assigned", assignedProviderId: application.providerId })
    .where(eq(tasks.id, taskId));

  return NextResponse.json({ success: true });
}
