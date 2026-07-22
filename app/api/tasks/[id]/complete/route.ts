import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";

// POST /api/tasks/[id]/complete — client confirms work, escrow releases to provider
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Pehle login karein" }, { status: 401 });
  }
  const { id: taskId } = await params;

  const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  const task = found[0];
  if (!task) return NextResponse.json({ error: "Task nahi mila" }, { status: 404 });
  if (task.postedById !== session.userId) {
    return NextResponse.json({ error: "Sirf client kaam complete confirm kar sakta hai" }, { status: 403 });
  }
  if (task.status !== "submitted") {
    return NextResponse.json({ error: "Provider ne abhi tak submit nahi kiya" }, { status: 400 });
  }

  const paymentRows = await db.select().from(payments).where(eq(payments.taskId, taskId)).limit(1);
  const payment = paymentRows[0];
  if (!payment || payment.status !== "held_in_escrow") {
    return NextResponse.json({ error: "Escrow payment nahi mili" }, { status: 400 });
  }

  const provider = getPaymentProvider();
  const result = await provider.release(payment.providerRef || "", task.assignedProviderId || "");
  if (!result.success) {
    return NextResponse.json({ error: "Payment release fail ho gayi" }, { status: 500 });
  }

  await db
    .update(payments)
    .set({ status: "released", releasedAt: new Date() })
    .where(eq(payments.taskId, taskId));

  await db.update(tasks).set({ status: "completed" }).where(eq(tasks.id, taskId));

  return NextResponse.json({ success: true });
}
