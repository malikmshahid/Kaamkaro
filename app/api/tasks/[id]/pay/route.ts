import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments";
import { randomUUID } from "crypto";

// POST /api/tasks/[id]/pay — client funds escrow once a provider is assigned
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }
    const { id: taskId } = await params;

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.postedById !== session.userId) {
      return NextResponse.json({ error: "Only the client can make the payment" }, { status: 403 });
    }
    if (task.status !== "assigned" || !task.assignedProviderId) {
      return NextResponse.json(
        { error: "Accept a provider before paying" },
        { status: 400 }
      );
    }

    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.taskId, taskId))
      .limit(1);
    if (existingPayment.length > 0) {
      return NextResponse.json({ error: "Payment has already been made" }, { status: 409 });
    }

    const provider = getPaymentProvider();
    const result = await provider.charge(task.budget, session.userId);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Payment failed" }, { status: 500 });
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

  } catch (err) {
    console.error("POST failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
