import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { and, eq, isNotNull } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";
import { guardRequest } from "@/lib/rateLimit";
import { mediateDispute } from "@/lib/disputeMediator";

export const maxDuration = 60;

/**
 * GET /api/admin/mediation
 *
 * The dispute queue, oldest first, with the escrow amount and how long the job
 * has been stuck. Admin-only.
 */
export async function GET(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "adminAction");
    if (limited) return limited;
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const rows = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        budget: tasks.budget,
        currency: tasks.currency,
        category: tasks.category,
        city: tasks.city,
        proofUrl: tasks.proofUrl,
        verificationStatus: tasks.verificationStatus,
        verificationNotes: tasks.verificationNotes,
        expiresAt: tasks.expiresAt,
        createdAt: tasks.createdAt,
      })
      .from(tasks)
      .where(and(eq(tasks.status, "disputed"), isNotNull(tasks.postedById)))
      .limit(100);

    return NextResponse.json({ disputes: rows });
  } catch (err) {
    console.error("GET /api/admin/mediation failed:", err);
    return NextResponse.json({ error: "Could not load the dispute queue." }, { status: 500 });
  }
}

/**
 * POST /api/admin/mediation  { taskId }
 *
 * Runs the AI mediator over one disputed job and returns an advisory brief.
 * It never moves money — that stays with POST /api/admin/tasks/[id]/resolve.
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "adminAction");
    if (limited) return limited;
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = (await req.json().catch(() => ({}))) as { taskId?: string };
    const taskId = typeof body?.taskId === "string" ? body.taskId.slice(0, 64) : "";
    if (!taskId) return NextResponse.json({ error: "Which dispute?" }, { status: 400 });

    const [task] = await db
      .select({ id: tasks.id, status: tasks.status })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== "disputed") {
      return NextResponse.json(
        { error: "Only disputed jobs can be mediated." },
        { status: 409 }
      );
    }

    const brief = await mediateDispute(taskId);
    return NextResponse.json({ brief });
  } catch (err) {
    console.error("POST /api/admin/mediation failed:", err);
    return NextResponse.json({ error: "The mediator failed. Decide manually." }, { status: 500 });
  }
}
