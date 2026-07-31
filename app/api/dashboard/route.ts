import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications, tools } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
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

    const myTools = await db
      .select()
      .from(tools)
      .where(eq(tools.providerId, session.userId))
      .orderBy(desc(tools.createdAt));

    return NextResponse.json({ postedTasks, myApplications, myTools });

  } catch (err) {
    console.error("GET  failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
