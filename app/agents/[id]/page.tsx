"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { formatMoney } from "@/lib/currency";

type Agent = {
  id: string;
  name: string;
  description: string;
  categories: string;
  pricePerTaskPkr: number | null;
  avgDeliveryHours: number;
  status: "active" | "paused";
  taskCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
};

type RecentTask = {
  id: string;
  title: string;
  category: string;
  budget: number;
  currency: string;
  status: string;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string | null;
};

function levelBadge(taskCount: number) {
  if (taskCount >= 30) return { label: "Elite Agent", emoji: "🏆" };
  if (taskCount >= 10) return { label: "Trusted Agent", emoji: "🔥" };
  if (taskCount >= 3) return { label: "Active Agent", emoji: "⭐" };
  return { label: "New Agent", emoji: "🌱" };
}

export default function AgentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAgent(data.agent || null);
        setRecentTasks(data.recentTasks || []);
        setReviews(data.reviews || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-6">
          <div className="h-40 animate-pulse rounded-2xl border border-line bg-card/60" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-card/60" />
            ))}
          </div>
        </main>
      </>
    );
  }

  if (!agent) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-6">
          <div className="card-lux rounded-2xl p-8 text-center">
            <p className="font-display text-2xl text-heading">This agent isn&apos;t here</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink/60">
              The listing may have been paused or removed by its owner.
            </p>
            <Link
              href="/agents"
              className="sheen mt-6 inline-block rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream"
            >
              Browse agents
            </Link>
          </div>
        </main>
      </>
    );
  }

  const badge = levelBadge(agent.taskCount);
  const categories = agent.categories.split(",").map((c) => c.trim()).filter(Boolean);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-5xl px-5 pb-8 pt-11 sm:px-6 sm:pb-10 sm:pt-14">
            <Link
              href="/agents"
              className="reveal mb-5 inline-flex items-center gap-1.5 text-xs font-semibold text-ink/50 transition hover:text-ink"
            >
              ← All agents
            </Link>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="reveal flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-gold-500/35 bg-card/70 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-600 shadow-lux-sm dark:text-gold-300">
                    AI agent
                  </span>
                  <span className="rounded-full bg-green-700/10 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-green-700 dark:text-green-300">
                    {badge.label}
                  </span>
                  {agent.status === "paused" && (
                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-red-600 dark:text-red-300">
                      Paused
                    </span>
                  )}
                </div>
                <h1 className="reveal reveal-1 mt-4 font-display text-[2.05rem] font-medium leading-[1.03] tracking-[-0.02em] text-heading sm:text-[2.9rem]">
                  {agent.name}
                </h1>
                <p className="reveal reveal-2 mt-3 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-[15px]">
                  {agent.description}
                </p>
              </div>

              <div className="reveal reveal-2 card-lux w-full max-w-xs rounded-2xl p-5">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                  Starting price
                </p>
                <p className="mt-1 font-display text-2xl text-heading">
                  {agent.pricePerTaskPkr
                    ? formatMoney(agent.pricePerTaskPkr, "PKR")
                    : "Custom"}
                </p>
                <p className="mt-1 text-[12px] text-ink/50">
                  ~{agent.avgDeliveryHours}h typical delivery
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-[12.5px] text-ink/60">
                  <span>{agent.taskCount} jobs done</span>
                  <span>
                    {agent.ratingCount > 0
                      ? `${agent.ratingAvg.toFixed(1)} ★ (${agent.ratingCount})`
                      : "No reviews yet"}
                  </span>
                </div>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="reveal reveal-3 mt-5 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border border-line bg-card/80 px-3 py-1.5 text-[11.5px] font-medium text-ink/65 shadow-lux-sm"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl px-5 py-9 sm:px-6 sm:py-11">
          <div className="card-lux relative overflow-hidden rounded-2xl p-5 sm:p-6">
            <div className="gold-hairline absolute inset-x-5 top-0 opacity-70" aria-hidden="true" />
            <p className="font-display text-[15px] text-heading">How to hire this agent</p>
            <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-ink/65">
              Post an open task in one of the categories above. The agent&apos;s owner sees it and can
              apply; once you accept, the work runs through the same escrow, chat and proof
              verification as any human provider — and you get a verifiable receipt at the end.
            </p>
            <Link
              href="/tasks/new"
              className="sheen mt-4 inline-block rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream"
            >
              Post a task
            </Link>
          </div>

          <section className="mt-10">
            <h2 className="mb-4 font-display text-xl text-heading">Recently completed</h2>
            {recentTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line/90 bg-card/50 px-6 py-10 text-center">
                <p className="text-sm text-ink/55">
                  No completed jobs yet — be the first to hire this agent.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentTasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    className="card-lux flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm transition-transform hover:-translate-y-0.5 hover:border-gold-500/40"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium text-heading">{t.title}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full bg-ink/8 px-2 py-0.5 text-[10.5px] font-semibold capitalize text-ink/55">
                        {t.status}
                      </span>
                      <span className="tnum text-ink/60">{formatMoney(t.budget, t.currency)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="mb-4 font-display text-xl text-heading">Reviews</h2>
            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line/90 bg-card/50 px-6 py-10 text-center">
                <p className="text-sm text-ink/55">No reviews yet for this agent.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {reviews.map((r) => (
                  <div key={r.id} className="card-lux rounded-xl p-4">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-heading">
                        {r.reviewerName || "Anonymous"}
                      </p>
                      <span className="text-[12px] text-gold-500">
                        {"★".repeat(r.rating)}
                        <span className="text-ink/20">{"★".repeat(Math.max(0, 5 - r.rating))}</span>
                      </span>
                    </div>
                    {r.comment && <p className="text-[13px] leading-relaxed text-ink/65">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
