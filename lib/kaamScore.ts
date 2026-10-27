/**
 * KaamScore — a single, explainable trust number for a provider.
 *
 * Every marketplace shows stars, and stars lie: three 5★ from friends looks
 * identical to forty 5★ from real clients. KaamScore fixes that by weighting
 * volume and verification, and — unlike a black-box rating — it always ships
 * with the exact breakdown that produced it, so a client can see *why* a
 * provider scored 82 instead of 61.
 *
 * It is computed from data we already have. Nothing here is guessed, and no
 * part of it can be bought.
 *
 *   35  completed work      (log scale — 1 job is not 1/30th of 30 jobs)
 *   25  rating quality      (average, discounted while reviews are few)
 *   15  review volume       (how much evidence exists behind that average)
 *   15  identity verified   (CNIC / passport checked by the team)
 *   10  account age         (survives long enough to be accountable)
 *  ---
 *  100
 */

export type KaamScorePart = {
  key: "work" | "rating" | "reviews" | "verified" | "tenure";
  label: string;
  points: number;
  max: number;
  detail: string;
};

export type KaamScoreResult = {
  score: number;
  grade: { label: string; tone: "elite" | "trusted" | "building" | "new" };
  parts: KaamScorePart[];
};

export type KaamScoreInput = {
  completedTasks: number;
  ratingAvg: number;
  ratingCount: number;
  verified: boolean;
  /** Days since the account was created. */
  memberSinceDays: number;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/** 1 job → 7, 3 → 14, 7 → 21, 15 → 28, 31 → 35. */
function workPoints(completed: number) {
  if (completed <= 0) return 0;
  return Math.round(clamp(7 * Math.log2(1 + completed), 0, 35));
}

/** 4.8★ with 14 reviews → ~24 of 25. One 5★ review alone → ~5, by design. */
function ratingPoints(avg: number, count: number) {
  if (count <= 0 || avg <= 0) return 0;
  const quality = clamp(avg / 5, 0, 1);
  const confidence = clamp(count / 5, 0, 1); // full weight at 5+ reviews
  return Math.round(25 * quality * confidence);
}

function reviewPoints(count: number) {
  return Math.round(clamp(count * 1.5, 0, 15));
}

function tenurePoints(days: number) {
  return Math.round(clamp((days / 30) * 10, 0, 10));
}

export function kaamScore(input: KaamScoreInput): KaamScoreResult {
  const completed = Math.max(0, Math.floor(input.completedTasks || 0));
  const avg = Number(input.ratingAvg || 0);
  const count = Math.max(0, Math.floor(input.ratingCount || 0));
  const days = Math.max(0, Math.floor(input.memberSinceDays || 0));

  const work = workPoints(completed);
  const rating = ratingPoints(avg, count);
  const reviews = reviewPoints(count);
  const verified = input.verified ? 15 : 0;
  const tenure = tenurePoints(days);

  const score = clamp(work + rating + reviews + verified + tenure, 0, 100);

  const grade: KaamScoreResult["grade"] =
    score >= 80
      ? { label: "Elite", tone: "elite" }
      : score >= 60
        ? { label: "Trusted", tone: "trusted" }
        : score >= 40
          ? { label: "Building", tone: "building" }
          : { label: "New", tone: "new" };

  return {
    score,
    grade,
    parts: [
      {
        key: "work",
        label: "Completed work",
        points: work,
        max: 35,
        detail:
          completed === 0
            ? "No completed jobs yet"
            : `${completed} job${completed === 1 ? "" : "s"} completed here`,
      },
      {
        key: "rating",
        label: "Rating quality",
        points: rating,
        max: 25,
        detail:
          count === 0
            ? "No reviews yet"
            : `${avg.toFixed(1)}★ average${count < 5 ? " — still building confidence" : ""}`,
      },
      {
        key: "reviews",
        label: "Review evidence",
        points: reviews,
        max: 15,
        detail: count === 0 ? "Nothing to weight yet" : `${count} review${count === 1 ? "" : "s"} on record`,
      },
      {
        key: "verified",
        label: "Identity verified",
        points: verified,
        max: 15,
        detail: input.verified ? "CNIC / passport checked" : "ID not verified yet",
      },
      {
        key: "tenure",
        label: "Account age",
        points: tenure,
        max: 10,
        detail: days < 30 ? `${days} day${days === 1 ? "" : "s"} on KaamKaro` : `${Math.floor(days / 30)} months on KaamKaro`,
      },
    ],
  };
}

export function daysSince(date: Date | string | null | undefined): number {
  if (!date) return 0;
  const then = new Date(date).getTime();
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, Math.floor((Date.now() - then) / 86_400_000));
}
