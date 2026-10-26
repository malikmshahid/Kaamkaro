import { db } from "@/db";
import { proofFingerprints } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { createHash } from "crypto";

/**
 * Duplicate-proof detection.
 *
 * Providers who run several jobs at once are tempted to submit the same
 * screenshot everywhere ("proof of delivery" used on three different tasks).
 * Clients can't tell; nobody reviews every thumbnail. We hash each uploaded
 * file and remember it, so a repeat of the *exact same bytes* on a different
 * task is caught instantly and surfaced as "needs manual review".
 *
 * Deliberately narrow: it only matches byte-identical files. It never blocks a
 * submission — it only informs the client.
 */

/** Fingerprint the first party's identity so we never flag a legit re-upload to the same task. */
export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export type DuplicateCheck = {
  duplicate: boolean;
  /** A previously submitted task that used the same file. */
  previousTaskId: string | null;
};

export async function checkDuplicateProof(
  hashes: string[],
  currentTaskId: string
): Promise<DuplicateCheck> {
  if (hashes.length === 0) return { duplicate: false, previousTaskId: null };
  try {
    for (const hash of hashes) {
      const rows = await db
        .select()
        .from(proofFingerprints)
        .where(
          and(eq(proofFingerprints.hash, hash), ne(proofFingerprints.taskId, currentTaskId))
        )
        .limit(1);
      if (rows[0]) {
        return { duplicate: true, previousTaskId: rows[0].taskId };
      }
    }
    return { duplicate: false, previousTaskId: null };
  } catch {
    // Never let an anti-fraud check break a real submission.
    return { duplicate: false, previousTaskId: null };
  }
}

/** Remember these hashes so future duplicates can be spotted. */
export async function rememberProof(
  hashes: string[],
  taskId: string,
  userId: string
): Promise<void> {
  if (hashes.length === 0) return;
  try {
    await db
      .insert(proofFingerprints)
      .values(hashes.map((hash) => ({ hash, taskId, userId })))
      .onConflictDoNothing();
  } catch {
    /* non-critical */
  }
}
