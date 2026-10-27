import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, payments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { getPaymentProvider } from "@/lib/payments";
import { guardRequest } from "@/lib/rateLimit";
import { z } from "zod";

const resolveSchema = z.object({
  decision: z.enum(["refund_client", "release_provider"], {
    error: "Decision must be refund_client or release_provider",
  }),
  notes: z.string().trim().max(1000).optional(),
});


/**
 * POST /api/admin/tasks/[id]/resolve
 * Body: { decision: "refund_client" | "release_provider", notes?: string }
 *
 * This is the manual override an admin uses once a dispute has been
 * investigated (reading the chat, the proof, and talking to both sides
 * outside the app if needed). It's intentionally a human decision — the
 * platform never auto-resolves disputes.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limited = await guardRequest(req, "adminAction");
    if (limited) return limited;
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const { id: taskId } = await params;
    const parsed = resolveSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid decision" },
        { status: 400 }
      );
    }
    const { decision, notes } = parsed.data;

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== "disputed") {
      return NextResponse.json({ error: "Only disputed tasks can be resolved" }, { status: 400 });
    }

    const payRows = await db.select().from(payments).where(eq(payments.taskId, taskId)).limit(1);
    const payment = payRows[0];
    if (!payment || payment.status !== "held_in_escrow") {
      return NextResponse.json({ error: "Escrow payment not found" }, { status: 400 });
    }

    const provider = getPaymentProvider();

    if (decision === "release_provider") {
      await provider.release(payment.providerRef || "", task.assignedProviderId || "", payment.netPayoutAmount);
      await db
        .update(payments)
        .set({ status: "released", releasedAt: new Date() })
        .where(eq(payments.taskId, taskId));
      await db
        .update(tasks)
        .set({
          status: "completed",
          verificationNotes: notes ? `Admin decision: ${notes}` : "Admin ne provider ke haq mein faisla diya",
        })
        .where(eq(tasks.id, taskId));
    } else if (decision === "refund_client") {
      await provider.refund(payment.providerRef || "");
      await db.update(payments).set({ status: "refunded" }).where(eq(payments.taskId, taskId));
      await db
        .update(tasks)
        .set({
          status: "cancelled",
          verificationNotes: notes ? `Admin decision: ${notes}` : "Admin ne client ko refund kiya",
        })
        .where(eq(tasks.id, taskId));
    } else {
      return NextResponse.json({ error: "Invalid decision" }, { status: 400 });
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
