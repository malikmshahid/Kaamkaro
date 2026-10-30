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
  // OTP guessing is the soft spot of an email-verified signup: 6 digits is
  // only a million-wide space, so cap attempts per IP hard.
  verifyEmail: { limit: 15, windowSeconds: 60 * 60 },
  // A 6-digit TOTP code is only a million-wide space; enrolment, disabling and
  // the login second step all share this tight bucket.
  totpAttempt: { limit: 10, windowSeconds: 15 * 60 },
  createTask: { limit: 20, windowSeconds: 60 * 60 },
  applyToTask: { limit: 30, windowSeconds: 60 * 60 },
  createTool: { limit: 10, windowSeconds: 60 * 60 },
  aiCopilot: { limit: 20, windowSeconds: 60 * 60 },
  submitProof: { limit: 20, windowSeconds: 60 * 60 },
  chatMessage: { limit: 120, windowSeconds: 60 * 60 },
  verifyProof: { limit: 12, windowSeconds: 60 * 60 }, // AI calls cost money
  toolOrder: { limit: 30, windowSeconds: 60 * 60 },
  uploadFile: { limit: 40, windowSeconds: 60 * 60 },
  review: { limit: 20, windowSeconds: 60 * 60 },
  payoutRequest: { limit: 10, windowSeconds: 24 * 60 * 60 },
  gatewayCallback: { limit: 60, windowSeconds: 60 * 60 },
  // ---- one bucket per class of state-changing action ----------------------
  taskAction: { limit: 60, windowSeconds: 60 * 60 }, // accept / complete / dispute / review
  agentAction: { limit: 120, windowSeconds: 60 * 60 }, // agent API (bearer key)
  adminAction: { limit: 120, windowSeconds: 60 * 60 },
  conversationAction: { limit: 120, windowSeconds: 60 * 60 },
  profileAction: { limit: 30, windowSeconds: 60 * 60 },
  keyAction: { limit: 20, windowSeconds: 60 * 60 },
  savedAction: { limit: 120, windowSeconds: 60 * 60 },
  inboxAction: { limit: 240, windowSeconds: 60 * 60 },
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

/** Per-API-key bucket for the agent endpoints (no cookies involved there). */
export async function throttleAgent(
  ruleName: RuleName,
  keyId: string
): Promise<RateLimitResult> {
  return rateLimit(`agent:${ruleName}:${keyId}`, RULES[ruleName]);
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

/**
 * One-line guard for state-changing routes.
 *
 * Keys on client IP + the route's own path, so a single abuser cannot burn
 * through the whole app's budget and one noisy endpoint does not lock a user
 * out of another. Routes that already rate-limit by user id (login, signup,
 * task creation…) keep doing that; this covers the long tail that had no
 * throttle at all.
 *
 * Usage, as the first statement inside the handler's try block:
 *
 *   const limited = await guardRequest(req, "taskAction");
 *   if (limited) return limited;
 *
 * `req` may be `_req` — pass `req` if the signature names it, otherwise pass
 * the request argument you have. Never throws: a database hiccup fails open.
 */
export async function guardRequest(
  req: Request,
  ruleName: RuleName,
  extra?: string
): Promise<Response | null> {
  const path = new URL(req.url).pathname;
  const bucket = extra ? `${clientIp(req)}:${path}:${extra}` : `${clientIp(req)}:${path}`;
  const result = await rateLimit(`${ruleName}:${bucket}`, RULES[ruleName]);
  return result.allowed ? null : tooManyRequests(result);
}
