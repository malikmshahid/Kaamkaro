"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { formatMoney } from "@/lib/currency";
import type { KaamScoreResult } from "@/lib/kaamScore";

type Provider = {
  id: string;
  name: string;
  city: string | null;
  bio: string | null;
  skills: string | null;
  ratingAvg: number;
  ratingCount: number;
  cnicVerified: boolean;
  createdAt: string;
};

type Tool = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  deliveryDays: number;
  orderCount: number;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string | null;
};

function levelBadge(completedCount: number) {
  if (completedCount >= 30) return { label: "Legend", emoji: "🏆" };
  if (completedCount >= 10) return { label: "Pro", emoji: "🔥" };
  if (completedCount >= 3) return { label: "Rising Star", emoji: "⭐" };
  return { label: "Rookie", emoji: "🌱" };
}

export default function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [score, setScore] = useState<KaamScoreResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/providers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProvider(data.provider);
        setTools(data.tools || []);
        setReviews(data.reviews || []);
        setCompletedCount(data.completedCount || 0);
        setScore(data.kaamScore || null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-4xl px-5 py-14 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-3 w-24 rounded bg-line/60" />
            <div className="h-10 w-2/3 rounded bg-line/60" />
            <div className="h-24 rounded-2xl bg-line/40" />
            <div className="h-40 rounded-2xl bg-line/40" />
          </div>
        </main>
      </>
    );
  }

  if (!provider) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-3xl px-5 py-20 text-center sm:px-6">
          <p className="font-display text-2xl text-heading">This profile couldn&apos;t be found</p>
          <p className="mt-2 text-sm text-ink/60">
            The provider may have deactivated their account.
          </p>
          <Link
            href="/tools"
            className="mt-6 inline-block rounded-full bg-green-900 px-6 py-2.5 text-sm font-semibold text-cream hover:bg-green-800"
          >
            Browse the Toolbox
          </Link>
        </main>
      </>
    );
  }

  const badge = levelBadge(completedCount);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-5xl px-5 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14">
            <div className="flex flex-wrap items-start gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-900 to-green-950 font-display text-2xl text-cream shadow-[0_18px_36px_-24px_rgba(11,32,22,0.9)] ring-1 ring-inset ring-white/10">
                {provider.name?.[0]?.toUpperCase() || "K"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="break-words font-display text-[1.9rem] font-medium leading-tight tracking-[-0.015em] text-heading sm:text-[2.5rem] [overflow-wrap:anywhere]">
                    {provider.name}
                  </h1>
                  <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-gold-600 dark:bg-gold-500/15 dark:text-gold-300">
                    {badge.emoji} {badge.label}
                  </span>
                  {provider.cnicVerified && (
                    <span className="rounded-full bg-green-900 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-cream">
                      ✓ ID verified
                    </span>
                  )}
                </div>
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/55">
                  <span>{provider.city || "Location not set"}</span>
                  <span>·</span>
                  <span>
                    {provider.ratingCount > 0
                      ? `${provider.ratingAvg.toFixed(1)} ★ (${provider.ratingCount} reviews)`
                      : "No reviews yet"}
                  </span>
                  <span>·</span>
                  <span>{completedCount} tasks completed</span>
                </p>
                {provider.bio && (
                  <p className="mt-4 max-w-2xl leading-relaxed text-ink/70">{provider.bio}</p>
                )}
              </div>
            </div>

            {score && (
              <div className="mt-6 grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="relative flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-950 via-green-900 to-green-800 text-cream shadow-[0_22px_44px_-30px_rgba(11,32,22,0.95)] ring-1 ring-inset ring-white/10">
                  <div className="text-center">
                    <p className="tnum font-display text-[2.1rem] leading-none">{score.score}</p>
                    <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-cream/60">
                      KaamScore
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-[1.15rem] text-heading">{score.grade.label} provider</p>
                    <span className="rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-600 dark:bg-gold-500/15 dark:text-gold-300">
                      {score.score} / 100
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink/55">
                    Built from completed jobs, review evidence, ID verification and account age —
                    every point is explained below. Nothing here can be bought.
                  </p>
                  <div className="mt-3 grid gap-x-5 gap-y-1.5 sm:grid-cols-2">
                    {score.parts.map((part) => (
                      <div key={part.key} className="flex items-center gap-2">
                        <div className="h-1.5 w-full max-w-[104px] overflow-hidden rounded-full bg-line">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-green-800 to-gold-500"
                            style={{ width: `${Math.round((part.points / part.max) * 100)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[10.5px] text-ink/50">
                          {part.label} {part.points}/{part.max}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
          {tools.length > 0 && (
            <section className="mb-10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-display text-[1.25rem] text-heading">Toolbox listings</h2>
                <span className="text-[11px] uppercase tracking-[0.14em] text-ink/40">
                  {tools.length} live
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {tools.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tools/${t.id}`}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-card p-5 shadow-lux-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold-500/40 hover:shadow-lux-lg"
                  >
                    <span
                      className="gold-hairline absolute inset-x-6 top-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                    <p className="break-words font-display text-[1.1rem] leading-snug text-heading [overflow-wrap:anywhere]">
                      {t.title}
                    </p>
                    <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-ink/60">{t.description}</p>
                    <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                      <span className="tnum font-display text-[1.1rem] text-green-800 dark:text-green-300">
                        {formatMoney(t.price, t.currency)}
                      </span>
                      <span className="text-[11px] uppercase tracking-wide text-ink/45">
                        {t.orderCount} orders
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-4 font-display text-[1.25rem] text-heading">Reviews</h2>
            {reviews.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line bg-card/50 px-5 py-10 text-center">
                <p className="text-sm text-ink/55">
                  No reviews yet — this provider is just getting started.
                </p>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {reviews.map((r) => (
                <div key={r.id} className="card-lux p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-gold-500">{"★".repeat(r.rating)}</p>
                    <p className="text-xs text-ink/40">{r.reviewerName}</p>
                  </div>
                  {r.comment && <p className="text-sm leading-relaxed text-ink/60">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
