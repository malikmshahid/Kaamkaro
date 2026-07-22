import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  }
  const { id: taskId } = await params;
  const body = await req.json().catch(() => ({}));

  const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = found[0];
  if (!task) return NextResponse.json({ error: "Task nahi mila" }, { status: 404 });
  if (task.status !== "open") {
    return NextResponse.json({ error: "Ye task ab open nahi hai" }, { status: 400 });
  }
  if (task.postedById === session.userId) {
    return NextResponse.json({ error: "Aap apne hi task pe apply nahi kar sakte" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(applications)
    .where(and(eq(applications.taskId, taskId), eq(applications.providerId, session.userId)))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "Aap pehle hi apply kar chuke hain" }, { status: 409 });
  }

  const id = randomUUID();
  await db.insert(applications).values({
    id,
    taskId,
    providerId: session.userId,
    message: body.message || null,
    status: "pending",
  });

  return NextResponse.json({ success: true, applicationId: id });
}
