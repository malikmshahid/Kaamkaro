"use client";

import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/currency";

/**
 * Price Fairness Meter.
 *
 * Fetches the observed price range for a category (and city, when there is
 * enough local signal) from /api/insights/price and tells the user where their
 * number sits: below the market, inside it, or above it.
 *
 * Two modes:
 *   variant="browse"  → just show the market range (used where no amount exists)
 *   variant="verdict" → show the range *and* judge the amount the user typed
 *
 * It never invents a number: when there is no comparable work yet it says so.
 */

type Insight = {
  available: boolean;
  basis?: "city" | "country" | "none";
  currency?: string;
  sampleSize?: number;
  tasks?: number;
  tools?: number;
  low?: number;
  median?: number;
  high?: number;
  min?: number;
  max?: number;
  message?: string;
};

export default function PriceFairness({
  category,
  city,
  amount,
  variant = "verdict",
  className = "",
}: {
  category?: string | null;
  city?: string | null;
  amount?: number | null;
  variant?: "verdict" | "browse";
  className?: string;
}) {
  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!category) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("category", category);
    if (city && city.trim()) params.set("city", city.trim());

    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/insights/price?${params.toString()}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [category, city]);

  if (!category) return null;

  if (loading && !data) {
    return (
      <div className={`animate-pulse rounded-xl border border-line bg-card p-3.5 ${className}`}>
        <div className="h-3 w-32 rounded bg-line/70" />
        <div className="mt-2 h-4 w-48 rounded bg-line/50" />
      </div>
    );
  }

  if (!data) return null;

  if (!data.available) {
    return (
      <div className={`rounded-xl border border-dashed border-line bg-card/60 p-3.5 ${className}`}>
        <p className="text-[10.5px] uppercase tracking-[0.16em] text-ink/45">Market rate</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink/55">
          {data.message || "No comparable work yet — you are setting the first price here."}
        </p>
      </div>
    );
  }

  const currency = data.currency || "PKR";
  const low = data.low ?? 0;
  const high = data.high ?? 0;
  const median = data.median ?? 0;
  const where = data.basis === "city" && city ? city : "Pakistan-wide";

  let verdict: { label: string; tone: "low" | "fair" | "high"; note: string } | null = null;
  if (variant === "verdict" && typeof amount === "number" && amount > 0 && median > 0) {
    if (amount < low) {
      verdict = {
        label: "Below the market",
        tone: "low",
        note: `Most work like this lands between ${formatMoney(low, currency)} and ${formatMoney(
          high,
          currency
        )}. A low budget is allowed — it just gets fewer proposals.`,
      };
    } else if (amount > high) {
      verdict = {
        label: "Above the market",
        tone: "high",
        note: `You are paying more than the typical ${formatMoney(median, currency)}. Providers will move fast.`,
      };
    } else {
      verdict = {
        label: "Fair range",
        tone: "fair",
        note: `Right in the middle of what this work actually pays (median ${formatMoney(
          median,
          currency
        )}).`,
      };
    }
  }

  const toneStyles =
    verdict?.tone === "low"
      ? "border-gold-500/35 bg-gold-100/50 dark:bg-gold-500/10"
      : verdict?.tone === "high"
        ? "border-green-900/20 bg-green-950/[0.04] dark:border-green-500/25 dark:bg-green-500/10"
        : "border-green-800/25 bg-green-950/[0.04] dark:border-green-500/25 dark:bg-green-500/10";

  // Position marker (0-100%) for the range bar when we have an amount.
  const span = Math.max(1, high - low);
  const pos =
    typeof amount === "number" && amount > 0
      ? Math.min(100, Math.max(0, Math.round(((amount - low) / span) * 100)))
      : null;

  return (
    <div
      className={`rounded-xl border p-3.5 ${verdict ? toneStyles : "border-line bg-card"} ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <p className="text-[10.5px] uppercase tracking-[0.16em] text-ink/45">
          Market rate · {where}
        </p>
        <p className="text-[10.5px] text-ink/40">
          {data.sampleSize} comparable {data.sampleSize === 1 ? "job" : "jobs"}
        </p>
      </div>

      <p className="tnum mt-1.5 font-display text-[1.05rem] leading-none text-heading">
        {formatMoney(low, currency)} – {formatMoney(high, currency)}
      </p>
      <p className="mt-1 text-[11.5px] text-ink/50">
        median {formatMoney(median, currency)} · real tasks and listings on KaamKaro
      </p>

      {pos !== null && (
        <div className="mt-3">
          <div className="relative h-2 rounded-full bg-line">
            <div className="absolute inset-y-0 left-0 w-full rounded-full bg-gradient-to-r from-gold-300/60 via-green-700/40 to-green-800/60" />
            <span
              className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-green-900 shadow"
              style={{ left: `${pos}%` }}
              aria-hidden="true"
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-ink/35">
            <span>{formatMoney(data.min ?? low, currency)}</span>
            <span>{formatMoney(data.max ?? high, currency)}</span>
          </div>
        </div>
      )}

      {verdict && (
        <div className="mt-2.5">
          <p className="text-[11.5px] font-semibold text-heading">{verdict.label}</p>
          <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink/55">{verdict.note}</p>
        </div>
      )}
    </div>
  );
}
