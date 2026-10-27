import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, payments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { guardRequest } from "@/lib/rateLimit";
import { getPaymentProvider } from "@/lib/payments";
import { notify } from "@/lib/notify";
import { logPaymentEvent } from "@/lib/payments/escrow";

// POST /api/tasks/[id]/complete — client confirms work, escrow releases to provider
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await guardRequest(_req, "taskAction");
    if (limited) return limited;
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }
    const { id: taskId } = await params;

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.postedById !== session.userId) {
      return NextResponse.json({ error: "Only the client can confirm completion" }, { status: 403 });
    }
    if (task.status === "completed") {
      return NextResponse.json(
        { error: "This task is already completed and the payment was released" },
        { status: 409 }
      );
    }
    if (task.status !== "submitted") {
      return NextResponse.json({ error: "The provider has not submitted yet" }, { status: 400 });
    }

    const paymentRows = await db.select().from(payments).where(eq(payments.taskId, taskId)).limit(1);
    const payment = paymentRows[0];
    if (!payment || payment.status !== "held_in_escrow") {
      return NextResponse.json({ error: "Escrow payment not found" }, { status: 400 });
    }

    const provider = getPaymentProvider();
    const result = await provider.release(
      payment.providerRef || "",
      task.assignedProviderId || "",
      payment.netPayoutAmount
    );
    if (!result.success) {
      return NextResponse.json({ error: "Payment release failed" }, { status: 500 });
    }

    // Release exactly once. A double-click, a retried request or an attacker
    // replaying the call must not pay the provider twice, so the status flip is
    // a conditional update rather than a blind write.
    const released = await db
      .update(payments)
      .set({ status: "released", releasedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "held_in_escrow")))
      .returning({ id: payments.id });
    if (released.length === 0) {
      return NextResponse.json(
        { error: "This payment has already been released" },
        { status: 409 }
      );
    }

    const completed = await db
      .update(tasks)
      .set({ status: "completed" })
      .where(and(eq(tasks.id, taskId), eq(tasks.status, "submitted")))
      .returning({ id: tasks.id });
    if (completed.length === 0) {
      return NextResponse.json({ error: "This task is no longer awaiting confirmation" }, { status: 409 });
    }

    await logPaymentEvent(payment.id, "released", "Escrow released to the provider after client confirmation", {
      amount: payment.netPayoutAmount,
      currency: payment.currency,
      commission: payment.commissionAmount,
      releasedBy: session.userId,
    });

    if (task.assignedProviderId) {
      await notify(
        task.assignedProviderId,
        "payment_released",
        `Payment for "${task.title}" was released to you 🎉 (${payment.netPayoutAmount} ${payment.currency} after platform fee)`,
        taskId
      );
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("POST failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
