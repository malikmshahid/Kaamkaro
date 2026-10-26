import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Database-backed rate limiting.
 *
 * Vercel functions are stateless, so an in-memory Map resets on every cold
 * start and is per-instance — useless. Upstash/Redis would mean another
 * account and another key to manage, so we keep the counters in the Postgres
 * database we already have: one row per key, one atomic upsert per request.
 *
 * QA round 2 showed 10 wrong-password logins in a row with no throttling at
 * all; this closes that hole without adding a dependency.
 */
export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSeconds: number;
};

type Rule = { limit: number; windowSeconds: number };

export const RULES = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  signup: { limit: 6, windowSeconds: 60 * 60 },
  forgotPassword: { limit: 5, windowSeconds: 60 * 60 },
  createTask: { limit: 20, windowSeconds: 60 * 60 },
  applyToTask: { limit: 30, windowSeconds: 60 * 60 },
  createTool: { limit: 10, windowSeconds: 60 * 60 },
  aiCopilot: { limit: 20, windowSeconds: 60 * 60 },
  submitProof: { limit: 20, windowSeconds: 60 * 60 },
  chatMessage: { limit: 120, windowSeconds: 60 * 60 },
} satisfies Record<string, Rule>;

export type RuleName = keyof typeof RULES;

/** Best-effort client IP for a Next request (Vercel sets these headers). */
export function clientIp(req: Request): string {
  const h = req.headers;
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return h.get("x-real-ip") || h.get("cf-connecting-ip") || "unknown";
}

/**
 * Count one hit against `key`. Never throws: if the database hiccups we fail
 * open (let the request through) rather than locking people out of the site.
 */
export async function rateLimit(key: string, rule: Rule): Promise<RateLimitResult> {
  try {
    const res = await db.execute(sql`
      INSERT INTO rate_limits (key, count, reset_at)
      VALUES (${key}, 1, now() + ${rule.windowSeconds + " seconds"}::interval)
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
        reset_at = CASE
          WHEN rate_limits.reset_at < now()
          THEN now() + ${rule.windowSeconds + " seconds"}::interval
          ELSE rate_limits.reset_at
        END
      RETURNING count, reset_at
    `);
    const row = (res as unknown as { rows: { count: number; reset_at: string }[] }).rows[0];
    const count = Number(row?.count ?? 1);
    const resetAt = new Date(row?.reset_at ?? Date.now());
    const retryAfterSeconds = Math.max(0, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
    return {
      allowed: count <= rule.limit,
      remaining: Math.max(0, rule.limit - count),
      limit: rule.limit,
      retryAfterSeconds,
    };
  } catch {
    return { allowed: true, remaining: rule.limit, limit: rule.limit, retryAfterSeconds: 0 };
  }
}

/** Convenience: throttle by rule + scope + identity (ip or user id). */
export async function throttle(
  ruleName: RuleName,
  identity: string
): Promise<RateLimitResult> {
  return rateLimit(`${ruleName}:${identity}`, RULES[ruleName]);
}

export function tooManyRequests(result: RateLimitResult) {
  const minutes = Math.ceil(result.retryAfterSeconds / 60);
  return new Response(
    JSON.stringify({
      error:
        minutes > 1
          ? `Too many attempts. Please try again in about ${minutes} minutes.`
          : "Too many attempts. Please wait a moment and try again.",
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(result.retryAfterSeconds),
      },
    }
  );
}
