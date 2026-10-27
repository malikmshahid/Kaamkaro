import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, tools } from "@/db/schema";
import { and, eq, gt, ne } from "drizzle-orm";

/**
 * GET /api/insights/price?category=design&city=Lahore
 *
 * "What does this kind of work actually pay here?" — answered from real rows on
 * this platform, not from a static pricing table. Every marketplace tells you
 * to guess a budget; this returns the observed range so a client can post a
 * fair number and a provider can sanity-check a proposal.
 *
 * Basis:
 *   - every non-cancelled task with a real budget (open, assigned, completed…)
 *   - every active fixed-price Toolbox listing in the same category
 * City is applied only when there is enough local signal, otherwise we widen to
 * the whole country and say so in `basis`.
 *
 * Public, read-only, no personal data: prices and counts only.
 */

export const dynamic = "force-dynamic";

function quantile(sorted: number[], q: number) {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return Math.round(next !== undefined ? sorted[base] + rest * (next - sorted[base]) : sorted[base]);
}

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const category = (url.searchParams.get("category") || "").trim().slice(0, 40);
    const city = (url.searchParams.get("city") || "").trim().slice(0, 60);

    const taskWhere = category
      ? and(ne(tasks.status, "cancelled"), gt(tasks.budget, 0), eq(tasks.category, category))
      : and(ne(tasks.status, "cancelled"), gt(tasks.budget, 0));

    const taskRows = await db
      .select({ budget: tasks.budget, city: tasks.city })
      .from(tasks)
      .where(taskWhere)
      .limit(2000);

    const toolRows = await db
      .select({ price: tools.price })
      .from(tools)
      .where(
        category
          ? and(eq(tools.status, "active"), gt(tools.price, 0), eq(tools.category, category))
          : and(eq(tools.status, "active"), gt(tools.price, 0))
      )
      .limit(2000);

    let sample: number[] = taskRows
      .map((r: { budget: number }) => Number(r.budget))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    let basis: "city" | "country" = "country";

    // Local signal only when it is meaningful (>= 4 tasks in that city).
    if (city) {
      const cityKey = city.toLowerCase();
      const local = taskRows
        .filter((r: { city: string | null }) => (r.city || "").toLowerCase() === cityKey)
        .map((r: { budget: number }) => Number(r.budget));
      if (local.length >= 4) {
        sample = local;
        basis = "city";
      }
    }

    const toolPrices = toolRows
      .map((r: { price: number }) => Number(r.price))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    // Toolbox listings are a fixed-price market signal, worth half the weight of
    // an actual task — include them but never let them dominate the sample.
    const combined = [...sample, ...toolPrices.slice(0, Math.floor(sample.length / 2) || toolPrices.length)];

    const sorted = combined.sort((a, b) => a - b);
    const taskCount = sample.length;
    const toolCount = toolPrices.length;

    if (sorted.length === 0) {
      return NextResponse.json({
        available: false,
        category: category || null,
        city: city || null,
        basis: "none",
        sampleSize: 0,
        message:
          "No comparable work on the platform yet — you are setting the first price for this.",
      });
    }

    const p25 = quantile(sorted, 0.25);
    const median = quantile(sorted, 0.5);
    const p75 = quantile(sorted, 0.75);

    // A usable "fair range": the middle half of what was actually paid, widened
    // to at least ±25% around the median so a 2-row sample doesn't produce a
    // uselessly tight band.
    const observedMin = Math.round(sorted[0]);
    const observedMax = Math.round(sorted[sorted.length - 1]);
    const low = Math.max(1, Math.round(Math.min(p25, Math.max(median * 0.75, observedMin))));
    const high = Math.round(Math.max(p75, Math.min(median * 1.25, observedMax)));

    return NextResponse.json({
      available: true,
      category: category || null,
      city: city || null,
      basis,
      currency: "PKR",
      sampleSize: sorted.length,
      tasks: taskCount,
      tools: toolCount,
      min: observedMin,
      low,
      median,
      high,
      max: observedMax,
    });
  } catch (err) {
    console.error("price insights failed:", err);
    return NextResponse.json({ available: false, error: "Could not read market data" }, { status: 500 });
  }
}
