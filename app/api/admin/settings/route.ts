import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { adminConfigAudit, platformConfig } from "@/db/schema";
import { requireAdmin } from "@/lib/adminAuth";
import { guardRequest } from "@/lib/rateLimit";
import {
  getPlatformSettings,
  marketplaceSettingsSchema,
  siteContentSchema,
} from "@/lib/platformSettings";

const updateSchema = z.object({
  section: z.enum(["siteContent", "marketplace"]),
  value: z.unknown(),
}).strict();

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    const [settings, audit] = await Promise.all([
      getPlatformSettings(),
      db.select({ id: adminConfigAudit.id, actorId: adminConfigAudit.actorId,
        section: adminConfigAudit.section, beforeValue: adminConfigAudit.beforeValue,
        afterValue: adminConfigAudit.afterValue, createdAt: adminConfigAudit.createdAt })
        .from(adminConfigAudit).orderBy(desc(adminConfigAudit.createdAt)).limit(20),
    ]);
    return NextResponse.json({ settings, audit });
  } catch (error) {
    console.error("GET /api/admin/settings failed:", error);
    return NextResponse.json({ error: "Could not load platform settings." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const limited = await guardRequest(req, "adminAction");
    if (limited) return limited;
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

    const body = await req.json().catch(() => null);
    const parsedBody = updateSchema.safeParse(body);
    if (!parsedBody.success) return NextResponse.json({ error: "Choose a valid settings section." }, { status: 400 });

    const { section } = parsedBody.data;
    const schema = section === "siteContent" ? siteContentSchema : marketplaceSettingsSchema;
    const parsedValue = schema.safeParse(parsedBody.data.value);
    if (!parsedValue.success) {
      return NextResponse.json({ error: parsedValue.error.issues[0]?.message || "Settings are invalid." }, { status: 400 });
    }

    const [current] = await db.select().from(platformConfig).where(eq(platformConfig.id, "default")).limit(1);
    const settings = await getPlatformSettings();
    const beforeValue = section === "siteContent" ? settings.siteContent : settings.marketplace;
    const afterValue = parsedValue.data as Record<string, unknown>;

    if (current) {
      await db.update(platformConfig).set({
        ...(section === "siteContent" ? { siteContent: afterValue } : { marketplaceSettings: afterValue }),
        updatedAt: new Date(), updatedBy: admin.id,
      }).where(eq(platformConfig.id, "default"));
    } else {
      await db.insert(platformConfig).values({
        id: "default", commissionRatePercent: 10,
        siteContent: section === "siteContent" ? afterValue : {},
        marketplaceSettings: section === "marketplace" ? afterValue : {},
        updatedBy: admin.id,
      });
    }

    await db.insert(adminConfigAudit).values({
      id: randomUUID(), actorId: admin.id, section,
      beforeValue: beforeValue as Record<string, unknown>, afterValue,
    });

    // Keep high-traffic public pages consistent with the newly saved values.
    for (const path of ["/", "/tasks", "/tasks/new", "/tools", "/tools/new"]) revalidatePath(path);
    return NextResponse.json({ success: true, section, savedAt: new Date().toISOString() });
  } catch (error) {
    console.error("PUT /api/admin/settings failed:", error);
    return NextResponse.json({ error: "Could not save settings. No payment or account records were changed." }, { status: 500 });
  }
}
