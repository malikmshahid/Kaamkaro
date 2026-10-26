import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, lte, isNotNull, lt } from "drizzle-orm";
import { rateLimits } from "@/db/schema";

// GET /api/cron/expire-tasks — called once a day by Vercel Cron (see
// vercel.json). The GET /api/tasks route already expires past-due tasks
// lazily on every visit; this is just a backup for days with no traffic.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  // Fail closed: if CRON_SECRET is unset, "Bearer undefined" must not work.
  if (!secret || secret.length < 16) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .update(tasks)
    .set({ status: "expired" })
    .where(and(eq(tasks.status, "open"), isNotNull(tasks.expiresAt), lte(tasks.expiresAt, new Date())))
    .returning({ id: tasks.id });

  // Housekeeping: drop rate-limit counters whose window has long passed so the
  // table stays tiny (one row per IP/action, deleted the day after it expires).
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const swept = await db
    .delete(rateLimits)
    .where(lt(rateLimits.resetAt, cutoff))
    .returning({ key: rateLimits.key });

  return NextResponse.json({ expiredCount: result.length, rateLimitsSwept: swept.length });
}
