import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, tasks, payments } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [taskCount] = await db.select({ count: sql<number>`count(*)::int` }).from(tasks);
  const [disputedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(eq(tasks.status, "disputed"));
  const [completedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tasks)
    .where(eq(tasks.status, "completed"));
  const [gmv] = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)::float` })
    .from(payments)
    .where(eq(payments.status, "released"));
  const [escrowHeld] = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)::float` })
    .from(payments)
    .where(eq(payments.status, "held_in_escrow"));

  return NextResponse.json({
    userCount: userCount.count,
    taskCount: taskCount.count,
    disputedCount: disputedCount.count,
    completedCount: completedCount.count,
    gmv: gmv.total,
    escrowHeld: escrowHeld.total,
  });
}
