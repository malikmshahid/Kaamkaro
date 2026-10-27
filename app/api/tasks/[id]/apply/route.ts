import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, applications } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { throttle, tooManyRequests } from "@/lib/rateLimit";
import { LIMITS } from "@/lib/constants";
import { randomUUID } from "crypto";
import { z } from "zod";

/**
 * A proposal is four things: what you say, what you charge, how long you need,
 * and proof you can do it. Every field is bounded — this is user input that
 * other people will read.
 */
const applySchema = z.object({
  message: z
    .string()
    .trim()
    .min(20, "Write at least a couple of sentences so the client can judge you")
    .max(LIMITS.applicationMessage, `Keep it under ${LIMITS.applicationMessage} characters`),
  proposedAmount: z
    .number()
    .positive("Your price must be more than zero")
    .max(5_000_000, "That amount looks too large — please double-check")
    .optional(),
  deliveryDays: z.number().int().min(1, "Delivery must be at least 1 day").max(365).optional(),
  portfolioUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), "Paste a full https:// link")
    .optional(),
  aiDrafted: z.boolean().optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Please log in first" }, { status: 401 });
    }
    const { id: taskId } = await params;

    const applyLimit = await throttle("applyToTask", session.userId);
    if (!applyLimit.allowed) return tooManyRequests(applyLimit);

    const parsed = applySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Please check your proposal" },
        { status: 400 }
      );
    }
    const { message, proposedAmount, deliveryDays, portfolioUrl, aiDrafted } = parsed.data;

    const found = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
    const task = found[0];
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.status !== "open") {
      return NextResponse.json({ error: "This task is no longer open" }, { status: 400 });
    }
    if (task.postedById === session.userId) {
      return NextResponse.json({ error: "You cannot apply to your own task" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(applications)
      .where(and(eq(applications.taskId, taskId), eq(applications.providerId, session.userId)))
      .limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "You have already applied" }, { status: 409 });
    }

    const id = randomUUID();
    await db.insert(applications).values({
      id,
      taskId,
      providerId: session.userId,
      message,
      proposedAmount: proposedAmount ?? null,
      currency: task.currency,
      deliveryDays: deliveryDays ?? null,
      portfolioUrl: portfolioUrl ? portfolioUrl : null,
      aiDrafted: aiDrafted ?? false,
      status: "pending",
    });

    // Tell the client something they can act on, not just "someone applied".
    const terms = [
      proposedAmount ? `${task.currency} ${proposedAmount.toLocaleString()}` : null,
      deliveryDays ? `${deliveryDays} day${deliveryDays === 1 ? "" : "s"}` : null,
    ].filter(Boolean);
    await notify(
      task.postedById,
      "application_received",
      terms.length
        ? `New proposal on "${task.title}" — ${terms.join(" · ")}`
        : `Someone applied to your task "${task.title}"`,
      taskId
    );

    return NextResponse.json({ success: true, applicationId: id });

  } catch (err) {
    console.error("POST failed:", err);
    return NextResponse.json(
      { error: "Something went wrong on our end. Please try again." },
      { status: 500 }
    );
  }
}
