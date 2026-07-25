import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      phone: users.phone,
      role: users.role,
      city: users.city,
      ratingAvg: users.ratingAvg,
      ratingCount: users.ratingCount,
      cnicVerified: users.cnicVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return NextResponse.json({ users: rows });
}
