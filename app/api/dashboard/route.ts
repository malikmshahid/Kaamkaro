import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  }

  const postedTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.postedById, session.userId))
    .orderBy(desc(tasks.createdAt));

  const myApplications = await db
    .select({
      applicationId: applications.id,
      applicationStatus: applications.status,
      taskId: tasks.id,
      taskTitle: tasks.title,
      taskBudget: tasks.budget,
      taskStatus: tasks.status,
    })
    .from(applications)
    .innerJoin(tasks, eq(applications.taskId, tasks.id))
    .where(eq(applications.providerId, session.userId))
    .orderBy(desc(applications.createdAt));

  return NextResponse.json({ postedTasks, myApplications });
}
