import { createHash } from "crypto";
import { db } from "@/db";
import { tasks, users, payments, proofFingerprints } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { kaamScore, daysSince, type KaamScoreResult } from "@/lib/kaamScore";

/**
 * A KaamKaro work receipt.
 *
 * "Trust us" is not verification. This module produces the same receipt for the
 * public page (/receipt/[id]) and the JSON endpoint (/api/receipt/[id]), so any
 * client, provider or outside system can confirm — independently of our UI —
 * that a job was really posted, delivered and released.
 *
 * The receipt id is a hash of the immutable parts of the task, so if the title
 * or amount were ever edited after the fact, the id would no longer match.
 *
 * Privacy: no client name, no emails, no phone numbers, no addresses, no proof
 * file URLs, and never the task description (it can contain a home address).
 */

export type Receipt = {
  version: "kaamkaro-receipt-v1";
  receiptId: string;
  url: string;
  task: {
    title: string;
    category: string;
    city: string | null;
    currency: string;
    amount: number;
    netPayout: number | null;
    commissionAmount: number | null;
  };
  escrow: {
    status: string;
    fundedAt: Date | null;
    releasedAt: Date | null;
    gateway: string | null;
  };
  proof: {
    verification: string;
    confidence: number | null;
    verifiedAt: Date | null;
    fileCount: number;
    contentHash: string | null;
  };
  provider: {
    displayName: string;
    verified: boolean;
    kaamScore: KaamScoreResult;
  } | null;
  issuedAt: Date | null;
  verifyAt: string;
};

export function receiptId(taskId: string, title: string, amount: number): string {
  return createHash("sha256")
    .update(`${taskId}|${title}|${Number(amount).toFixed(2)}|kaamkaro-receipt-v1`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

/** "Muhammad Shahid" → "Muhammad S." — enough to recognise, not enough to contact. */
export function maskName(name: string | null | undefined): string {
  if (!name) return "Provider";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || "Provider";
  const last = parts.length > 1 ? `${parts[parts.length - 1][0].toUpperCase()}.` : "";
  return [first, last].filter(Boolean).join(" ");
}

export type ReceiptResult =
  | { ok: true; receipt: Receipt }
  | { ok: false; reason: "not_found" | "not_completed" };

export async function getReceipt(taskId: string): Promise<ReceiptResult> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);
  if (!task) return { ok: false, reason: "not_found" };
  if (task.status !== "completed") return { ok: false, reason: "not_completed" };

  const [payment] = await db.select().from(payments).where(eq(payments.taskId, taskId)).limit(1);

  let provider: Receipt["provider"] = null;

  if (task.assignedProviderId) {
    const [p] = await db
      .select({
        name: users.name,
        cnicVerified: users.cnicVerified,
        ratingAvg: users.ratingAvg,
        ratingCount: users.ratingCount,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, task.assignedProviderId))
      .limit(1);

    if (p) {
      const [counts] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(
          and(eq(tasks.assignedProviderId, task.assignedProviderId), eq(tasks.status, "completed"))
        );

      provider = {
        displayName: maskName(p.name),
        verified: Boolean(p.cnicVerified),
        kaamScore: kaamScore({
          completedTasks: counts?.count ?? 0,
          ratingAvg: Number(p.ratingAvg || 0),
          ratingCount: Number(p.ratingCount || 0),
          verified: Boolean(p.cnicVerified),
          memberSinceDays: daysSince(p.createdAt),
        }),
      };
    }
  }

  const [fingerprint] = await db
    .select({ hash: proofFingerprints.hash })
    .from(proofFingerprints)
    .where(eq(proofFingerprints.taskId, taskId))
    .limit(1);

  const amount = Number(payment?.amount ?? task.budget);

  return {
    ok: true,
    receipt: {
      version: "kaamkaro-receipt-v1",
      receiptId: receiptId(task.id, task.title, amount),
      url: `/receipt/${task.id}`,
      task: {
        title: task.title,
        category: task.category,
        city: task.city || null,
        currency: task.currency,
        amount,
        netPayout: payment?.netPayoutAmount ?? null,
        commissionAmount: payment?.commissionAmount ?? null,
      },
      escrow: {
        status: payment?.status ?? "unknown",
        fundedAt: payment?.paidAt ?? payment?.createdAt ?? null,
        releasedAt: payment?.releasedAt ?? null,
        gateway: payment?.provider ?? null,
      },
      proof: {
        verification: task.verificationStatus,
        confidence: task.verificationConfidence ?? null,
        verifiedAt: task.verifiedAt ?? null,
        fileCount: (task.proofFiles || []).length,
        contentHash: fingerprint?.hash ? fingerprint.hash.slice(0, 16).toUpperCase() : null,
      },
      provider,
      issuedAt: payment?.releasedAt ?? task.verifiedAt ?? task.createdAt,
      verifyAt: `/api/receipt/${task.id}`,
    },
  };
}
