import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";

/**
 * Admin access is deliberately NOT granted through signup or any self-serve
 * flow. To make someone an admin, run this directly against the database:
 *
 *   UPDATE users SET role = 'admin' WHERE phone = '+92...';
 *
 * We re-check the role from the DB on every request rather than trusting the
 * role embedded in the JWT — a user's session cookie should not let them
 * self-escalate if their DB role changes (or was never admin to begin with).
 */
export async function requireAdmin() {
  const session = await getSessionUser();
  if (!session) return null;

  const found = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  const user = found[0];
  if (!user || user.role !== "admin") return null;

  return user;
}
