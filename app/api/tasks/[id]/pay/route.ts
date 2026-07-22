import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import { randomUUID } from "crypto";

// POST /api/tasks/[id]/pay — client funds escrow once a provider is assigned
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  }
  const { id: taskId } = await params;

  const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = found[0];
  if (!task) return NextResponse.json({ error: "Task nahi mila" }, { status: 404 });
  if (task.postedById !== session.userId) {
    return NextResponse.json({ error: "Sirf client payment kar sakta hai" }, { status: 403 });
  }
  if (task.status !== "assigned" || !task.assignedProviderId) {
    return NextResponse.json(
      { error: "Payment se pehle kisi provider ko accept karein" },
      { status: 400 }
    );
  }

  const existingPayment = await db
    .select()
    .from(payments)
    .where(eq(payments.taskId, taskId))
    .limit(1);
  if (existingPayment.length > 0) {
    return NextResponse.json({ error: "Payment pehle hi ho chuki hai" }, { status: 409 });
  }

  const provider = getPaymentProvider();
  const result = await provider.charge(task.budget, session.userId);
  if (!result.success) {
    return NextResponse.json({ error: result.error || "Payment fail ho gayi" }, { status: 500 });
  }

  const id = randomUUID();
  await db.insert(payments).values({
    id,
    taskId,
    payerId: session.userId,
    payeeId: task.assignedProviderId,
    amount: task.budget,
    provider: "mock",
    status: "held_in_escrow",
    providerRef: result.providerRef,
  });

  return NextResponse.json({ success: true, paymentId: id });
}
