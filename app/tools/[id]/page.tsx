"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";
import { formatMoney } from "@/lib/currency";
import { categoryLabel } from "@/lib/constants";
import type { KaamScoreResult } from "@/lib/kaamScore";

type Tool = {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  deliveryDays: number;
  city: string | null;
  status: string;
  orderCount: number;
  providerName: string | null;
  providerRating: number;
  providerRatingCount: number;
  providerCity: string | null;
  providerVerified?: boolean;
  providerCompleted?: number;
};

function deliveryLabel(days: number) {
  if (days <= 1) return "24 hours";
  if (days === 7) return "1 week";
  return `${days} days`;
}

function MiniTool({ t }: { t: Tool }) {
  return (
    <Link
      href={`/tools/${t.id}`}
      className="group flex items-start justify-between gap-3 rounded-xl border border-line bg-card p-3.5 transition-all hover:-translate-y-0.5 hover:border-gold-500/50 hover:shadow-[0_12px_30px_-24px_rgba(13,35,24,0.6)]"
    >
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold leading-snug text-heading [overflow-wrap:anywhere]">
          {t.title}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink/50">
          <span>⚡ {deliveryLabel(t.deliveryDays)}</span>
          <span>·</span>
          <span>{t.city || "Remote"}</span>
          {t.orderCount > 0 && (
            <>
              <span>·</span>
              <span>{t.orderCount} ordered</span>
            </>
          )}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-display text-base text-green-800 dark:text-green-300">
          {formatMoney(t.price, t.currency)}
        </p>
        <span className="text-[10px] uppercase tracking-wide text-ink/35 transition-colors group-hover:text-green-700">
          view →
        </span>
      </div>
    </Link>
  );
}

export default function ToolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");
  const [all, setAll] = useState<Tool[]>([]);
  const [score, setScore] = useState<KaamScoreResult | null>(null);

  useEffect(() => {
    fetch(`/api/tools/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setTool(data.tool);
        setScore(data.kaamScore || null);
      })
      .catch(() => setTool(null))
      .finally(() => setLoading(false));

    fetch(`/api/toolbox?sort=recommended`)
      .then((r) => r.json())
      .then((data) => setAll(Array.isArray(data.tools) ? data.tools : []))
      .catch(() => setAll([]));
  }, [id]);

  async function handleOrder() {
    setOrdering(true);
    setError("");
    try {
      const res = await fetch(`/api/tools/${id}/order`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not place the order.");
        return;
      }
      router.push(`/tasks/${data.taskId}`);
    } catch {
      setError("Network error — the order was not placed. Try again.");
    } finally {
      setOrdering(false);
    }
  }

  if (loading || userLoading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-28 rounded bg-line/60" />
            <div className="h-9 w-2/3 rounded bg-line/60" />
            <div className="h-56 rounded-2xl bg-line/40" />
          </div>
        </main>
      </>
    );
  }

  if (!tool) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-3xl px-5 py-16 text-center sm:px-6">
          <p className="font-display text-2xl text-heading">This service is not here anymore</p>
          <p className="mt-2 text-sm text-ink/60">The provider may have paused or removed it.</p>
          <Link href="/tools" className="mt-6 inline-block rounded-full bg-green-900 px-6 py-2.5 text-sm text-cream">
            Back to the Toolbox
          </Link>
        </main>
      </>
    );
  }

  const isOwnTool = user && user.id === tool.providerId;
  const rating = Number(tool.providerRating || 0);
  const hasReviews = Number(tool.providerRatingCount || 0) > 0;

  const others = all.filter((t) => t.id !== tool.id);
  const fromProvider = others.filter((t) => t.providerId === tool.providerId).slice(0, 3);
  const similar = others
    .filter((t) => t.category === tool.category)
    .slice()
    .sort((a, b) => Math.abs(a.price - tool.price) - Math.abs(b.price - tool.price))
    .slice(0, 3);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-7 pt-9 sm:px-6 sm:pt-12">
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/50 transition-colors hover:text-green-700"
            >
              ← The Toolbox
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em]">
              <span className="rounded-full bg-green-950/5 px-2.5 py-1 font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
                {categoryLabel(tool.category)}
              </span>
              <span className="text-ink/45">{tool.city || "Remote"}</span>
              <span className="rounded-full bg-gold-100 px-2.5 py-1 font-semibold text-gold-500 dark:bg-gold-500/15">
                ⚡ {deliveryLabel(tool.deliveryDays)}
              </span>
              <span className="rounded-full bg-green-900 px-2.5 py-1 font-semibold text-cream">
                🔒 escrow protected
              </span>
            </div>
            <h1 className="mt-3.5 max-w-3xl break-words font-display text-[1.75rem] font-medium leading-[1.08] tracking-[-0.015em] text-heading [overflow-wrap:anywhere] sm:text-[2.7rem]">
              {tool.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="tnum rounded-xl bg-gradient-to-br from-green-900 to-green-950 px-4 py-2 font-display text-[1.35rem] text-cream shadow-[0_16px_34px_-22px_rgba(11,32,22,0.9)] ring-1 ring-inset ring-white/10">
                {formatMoney(tool.price, tool.currency)}
              </span>
              <span className="rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink/65">
                fixed price — no bidding
              </span>
              {tool.orderCount > 0 && (
                <span className="rounded-full border border-line bg-card px-3 py-1.5 text-xs text-ink/60">
                  ordered {tool.orderCount} time{tool.orderCount === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-5 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <div className="min-w-0 space-y-6">
            <div className="card-lux relative overflow-hidden p-5 sm:p-6">
              <div className="gold-hairline absolute inset-x-6 top-0 opacity-70" aria-hidden="true" />
              <h2 className="mb-2 text-[10.5px] uppercase tracking-[0.18em] text-ink/45">
                What you get
              </h2>
              <p className="whitespace-pre-wrap break-words leading-relaxed text-ink/75 [overflow-wrap:anywhere]">
                {tool.description}
              </p>
            </div>

            <div className="card-lux relative overflow-hidden p-5 sm:p-6">
              <div className="gold-hairline absolute inset-x-6 top-0 opacity-70" aria-hidden="true" />
              <h2 className="mb-3 text-[10.5px] uppercase tracking-[0.18em] text-ink/45">
                How ordering works
              </h2>
              <ol className="space-y-3">
                {[
                  "You order — the provider is notified immediately and the task is created for you.",
                  "You fund the escrow. The money is held by KaamKaro, not by the provider.",
                  "The provider delivers, and uploads proof of the work.",
                  "You confirm, and the payment is released. Disagree and you can open a dispute.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-900 to-green-800 text-[10px] font-semibold text-cream ring-1 ring-inset ring-white/10">
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-ink/70">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card-lux relative overflow-hidden p-5 sm:p-6">
              <div className="gold-hairline absolute inset-x-6 top-0 opacity-70" aria-hidden="true" />
              <h2 className="mb-3 text-[10.5px] uppercase tracking-[0.18em] text-ink/45">
                What we need from you
              </h2>
              <ul className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Your address or brief", "Drop it in the task chat right after ordering."],
                  ["A confirmation", "Check the proof uploaded and confirm the work."],
                  ["3 days to respond", "No response and escrow auto-releases."],
                ].map(([title, body]) => (
                  <li key={title} className="rounded-xl bg-paper/70 p-3 dark:bg-green-500/5">
                    <p className="text-xs font-semibold text-heading">{title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink/55">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="card-lux relative overflow-hidden p-4">
              <div className="gold-hairline absolute inset-x-4 top-0 opacity-70" aria-hidden="true" />
              <div className="flex items-center justify-between gap-2">
                <p className="tnum font-display text-[1.6rem] text-heading">
                  {formatMoney(tool.price, tool.currency)}
                </p>
                <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold-500 dark:bg-gold-500/15">
                  {tool.currency}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink/50">
                Delivered in {deliveryLabel(tool.deliveryDays)} · escrow held until you confirm
              </p>

              {error && (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}

              {!user && (
                <Link
                  href={`/login?next=/tools/${id}`}
                  className="mt-4 block rounded-full bg-green-900 px-5 py-3 text-center text-sm font-semibold text-cream hover:bg-green-800"
                >
                  Log in to order
                </Link>
              )}

              {user && isOwnTool && (
                <div className="mt-4 rounded-xl bg-paper/70 px-3 py-2.5 text-xs text-ink/60 dark:bg-green-500/5">
                  This is your own listing — you can&apos;t order it yourself.
                  <Link href="/tools/new" className="mt-1 block font-semibold text-green-800 dark:text-green-300">
                    List another service →
                  </Link>
                </div>
              )}

              {user && !isOwnTool && (
                <button
                  onClick={handleOrder}
                  disabled={ordering}
                  className="mt-4 w-full rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-cream transition-transform hover:-translate-y-0.5 hover:opacity-95 disabled:translate-y-0 disabled:opacity-50"
                >
                  {ordering ? "Placing order…" : `Order now — ${formatMoney(tool.price, tool.currency)}`}
                </button>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-paper/70 px-2 py-2 dark:bg-green-500/5">
                  <p className="text-[10px] uppercase tracking-wide text-ink/40">Delivery</p>
                  <p className="text-xs font-semibold text-ink/75">{deliveryLabel(tool.deliveryDays)}</p>
                </div>
                <div className="rounded-xl bg-paper/70 px-2 py-2 dark:bg-green-500/5">
                  <p className="text-[10px] uppercase tracking-wide text-ink/40">Location</p>
                  <p className="truncate text-xs font-semibold text-ink/75">{tool.city || "Remote"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink/45">Your provider</p>
              <Link
                href={`/providers/${tool.providerId}`}
                className="mt-1 inline-flex items-center gap-1.5 font-display text-lg text-heading hover:text-green-700"
              >
                {tool.providerName || "Provider"}
                {tool.providerVerified ? (
                  <span className="text-xs text-green-800 dark:text-green-300" title="ID verified">
                    ✔
                  </span>
                ) : null}
              </Link>
              <p className="mt-0.5 text-xs text-ink/50">{tool.providerCity || "Location not set"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {hasReviews ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink/65 dark:bg-green-500/10">
                    <span className="text-gold-500">
                      {"★".repeat(Math.round(rating))}
                      <span className="text-line">{"★".repeat(Math.max(0, 5 - Math.round(rating)))}</span>
                    </span>
                    {rating.toFixed(1)} ({tool.providerRatingCount})
                  </span>
                ) : (
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink/45 dark:bg-green-500/10">
                    New provider — no reviews yet
                  </span>
                )}
                {typeof tool.providerCompleted === "number" && tool.providerCompleted > 0 && (
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[11px] text-ink/55 dark:bg-green-500/10">
                    {tool.providerCompleted} jobs done here
                  </span>
                )}
              </div>

              {score && (
                <div className="mt-3 rounded-xl border border-gold-500/25 bg-gradient-to-r from-gold-100/60 to-transparent px-3 py-2.5 dark:from-gold-500/10 dark:to-transparent">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-ink/45">KaamScore</p>
                    <p className="tnum font-display text-[1.05rem] leading-none text-heading">
                      {score.score}
                      <span className="text-[10px] text-ink/40">/100</span>
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-800 to-gold-500"
                      style={{ width: `${score.score}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-ink/45">
                    {score.grade.label} · completed jobs, reviews, ID check and account age
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-green-900/20 bg-green-950/[0.04] p-4 dark:bg-green-500/10">
              <p className="text-sm font-semibold text-heading">Why this is safe</p>
              <p className="mt-1 text-xs leading-relaxed text-ink/60">
                Ordering creates a real task with escrow. Money only moves to the provider when you
                confirm the work, and every step is logged for disputes.
              </p>
            </div>
          </aside>
        </div>

        {(fromProvider.length > 0 || similar.length > 0) && (
          <section className="border-t border-line bg-paper/40 dark:bg-green-500/[0.03]">
            <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6">
              {fromProvider.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="font-display text-lg text-heading">
                      Also by {tool.providerName || "this provider"}
                    </h2>
                    <Link
                      href={`/providers/${tool.providerId}`}
                      className="shrink-0 text-xs text-ink/50 hover:text-green-700"
                    >
                      View profile →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {fromProvider.map((t) => (
                      <MiniTool key={t.id} t={t} />
                    ))}
                  </div>
                </div>
              )}

              {similar.length > 0 && (
                <div className={fromProvider.length > 0 ? "mt-7" : ""}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="font-display text-lg text-heading">
                      Similar in {categoryLabel(tool.category)}
                    </h2>
                    <Link
                      href={`/tools?category=${tool.category}`}
                      className="shrink-0 text-xs text-ink/50 hover:text-green-700"
                    >
                      See all →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {similar.map((t) => (
                      <MiniTool key={t.id} t={t} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        <div className="h-20 lg:hidden" aria-hidden="true" />

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-wide text-ink/45">
                {deliveryLabel(tool.deliveryDays)} delivery
              </p>
              <p className="font-display text-lg leading-tight text-heading">
                {formatMoney(tool.price, tool.currency)}
              </p>
            </div>
            {!user ? (
              <Link
                href={`/login?next=/tools/${id}`}
                className="shrink-0 rounded-full bg-green-900 px-5 py-2.5 text-sm font-semibold text-cream"
              >
                Log in to order
              </Link>
            ) : isOwnTool ? (
              <span className="shrink-0 text-xs text-ink/50">Your own listing</span>
            ) : (
              <button
                onClick={handleOrder}
                disabled={ordering}
                className="shrink-0 rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
              >
                {ordering ? "Placing…" : "Order now"}
              </button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
