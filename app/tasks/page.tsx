"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SaveButton from "@/components/SaveButton";
import { formatMoney } from "@/lib/currency";
import { CATEGORIES, categoryLabel } from "@/lib/constants";
import { useUser } from "@/lib/useUser";

type WorkTask = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  currency: string;
  city: string | null;
  createdAt: string;
  expiresAt: string | null;
  postedByType: "human" | "ai_agent";
  clientName: string | null;
  clientVerified: boolean | null;
  clientRating: number | null;
  clientRatingCount: number | null;
  applicantCount: number;
  matchScore: number | null;
  matchReasons: string[];
};

type Payload = {
  tasks: WorkTask[];
  viewer: { signedIn: boolean; hasProfile: boolean };
  facets: { categories: Record<string, number> };
  stats: { open: number; totalBudget: number; avgBudget: number; newToday: number; myApplications: number };
};

const SORTS = [
  { value: "match", label: "Best match" },
  { value: "newest", label: "Newest" },
  { value: "budget", label: "Highest budget" },
  { value: "ending", label: "Ending soon" },
  { value: "competition", label: "Least competition" },
] as const;

function timeLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Closed";
  const hours = Math.floor(ms / 36e5);
  if (hours < 1) return "<1h left";
  if (hours < 24) return `${hours}h left`;
  return `${Math.floor(hours / 24)}d left`;
}

function ago(createdAt: string): string {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (mins < 5) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function MatchRing({ score }: { score: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * c;
  const tone = score >= 80 ? "#1c5236" : score >= 60 ? "#256b46" : "#c8963e";
  return (
    <div className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center">
      <svg viewBox="0 0 40 40" className="h-11 w-11 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-line" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
        />
      </svg>
      <span className="absolute text-[11px] font-semibold text-heading">{score}</span>
    </div>
  );
}

export default function FindWorkPage() {
  const { user, loading: userLoading } = useUser();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  // Filters re-query constantly. Only the very first load gets a skeleton —
  // after that the old results stay on screen (dimmed) so the board doesn't
  // blink on every keystroke.
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnce = useRef(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<string>("match");
  const [minBudget, setMinBudget] = useState(0);
  const [remoteOnly, setRemoteOnly] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    if (minBudget) params.set("minBudget", String(minBudget));
    if (remoteOnly) params.set("remote", "1");
    if (loadedOnce.current) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/find-work?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      setData(json);
      loadedOnce.current = true;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q, category, sort, minBudget, remoteOnly]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Guests have no skills to match against, so "best match" is really just
  // newest — don't label it as something it isn't.
  useEffect(() => {
    if (!userLoading && !user && sort === "match") setSort("newest");
  }, [user, userLoading, sort]);

  const tasks = data?.tasks || [];
  const stats = data?.stats;
  const top = useMemo(
    () => (sort === "match" && tasks.length > 1 && (tasks[0].matchScore ?? 0) >= 60 ? tasks[0] : null),
    [tasks, sort]
  );
  const rest = top ? tasks.slice(1) : tasks;
  const categories = CATEGORIES.filter(
    (c) => (data?.facets.categories[c.value] || 0) > 0 || category === c.value
  );

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* ------------------------------- HERO ------------------------------- */}
        <section className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 60% at 88% 0%, rgba(200,150,62,0.16) 0%, rgba(200,150,62,0) 60%), radial-gradient(45% 55% at 4% 100%, rgba(18,58,38,0.10) 0%, rgba(18,58,38,0) 65%)",
            }}
          />
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-100/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-500 dark:bg-gold-500/10">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
              Find work · Pakistan
            </p>
            <h1 className="mt-4 max-w-2xl font-display text-3xl leading-tight text-heading sm:text-5xl">
              Work that actually fits you.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65 sm:text-base">
              Every task here is escrow-backed — the money is already held before you start, so you
              never chase a client for payment. Sorted by how well it matches your skills, city and
              rate.
            </p>
            <Link
              href="/why-kaamkaro"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-green-800 hover:underline dark:text-green-300"
            >
              Why KaamKaro is different from other platforms →
            </Link>

            {/* search */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                  </svg>
                </span>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search work — 'delivery', 'logo', 'AC service'…"
                  aria-label="Search open work"
                  className="w-full rounded-full border border-line bg-card py-3 pl-11 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>
              <select
                value={sort}
                aria-label="Sort work by"
                onChange={(e) => setSort(e.target.value)}
                className="min-w-0 rounded-full border border-line bg-card px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 sm:w-48"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* filters */}
            <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <button
                onClick={() => setCategory("")}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  category === ""
                    ? "border-green-900 bg-green-900 text-cream"
                    : "border-line bg-card text-ink/70 hover:border-green-800/40"
                }`}
              >
                All work
              </button>
              {categories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(category === c.value ? "" : c.value)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    category === c.value
                      ? "border-green-900 bg-green-900 text-cream"
                      : "border-line bg-card text-ink/70 hover:border-green-800/40"
                  }`}
                >
                  {c.label}
                  <span className={`ml-1.5 ${category === c.value ? "text-cream/60" : "text-ink/40"}`}>
                    {data?.facets.categories[c.value] || 0}
                  </span>
                </button>
              ))}
              <span className="mx-1 hidden w-px shrink-0 bg-line sm:block" />
              {[0, 1000, 5000].map((b) => (
                <button
                  key={b}
                  onClick={() => setMinBudget(minBudget === b ? 0 : b)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    minBudget === b
                      ? "border-gold-500 bg-gold-500 text-cream"
                      : "border-line bg-card text-ink/70 hover:border-gold-500/50"
                  }`}
                >
                  {b === 0 ? "Any budget" : `Rs ${b.toLocaleString()}+`}
                </button>
              ))}
              <button
                onClick={() => setRemoteOnly(!remoteOnly)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  remoteOnly
                    ? "border-green-900 bg-green-900 text-cream"
                    : "border-line bg-card text-ink/70 hover:border-green-800/40"
                }`}
              >
                Remote only
              </button>
            </div>
          </div>
        </section>

        {/* ------------------------------ STATS ------------------------------- */}
        <section className="border-b border-line bg-card/40">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px overflow-hidden px-5 sm:grid-cols-4 sm:px-6">
            {[
              { label: "Open tasks", value: stats ? stats.open.toLocaleString() : "—" },
              { label: "New in 24h", value: stats ? stats.newToday.toLocaleString() : "—" },
              {
                label: "Money on the table",
                value: stats ? `Rs ${stats.totalBudget.toLocaleString()}` : "—",
              },
              {
                label: user ? "Your open applications" : "Average budget",
                value: stats
                  ? user
                    ? stats.myApplications.toLocaleString()
                    : `Rs ${stats.avgBudget.toLocaleString()}`
                  : "—",
              },
            ].map((s) => (
              <div key={s.label} className="px-1 py-5 sm:px-4">
                <p className="font-display text-xl text-heading sm:text-2xl">{s.value}</p>
                <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-ink/45">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ----------------------------- RESULTS ------------------------------ */}
        <section className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-xl text-heading">
              {loading ? "Finding work…" : `${tasks.length} task${tasks.length === 1 ? "" : "s"} you can take`}
              {refreshing && !loading && (
                <span className="inline-flex items-center gap-1.5 text-xs font-normal text-ink/40">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-500" />
                  updating
                </span>
              )}
            </h2>
            {!loading && (
              <p className="text-xs text-ink/45">
                Sorted by <span className="font-semibold text-ink/70">{SORTS.find((s) => s.value === sort)?.label}</span>
              </p>
            )}
          </div>

          {!user && !loading && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-900/20 bg-green-950/[0.04] px-4 py-3 dark:bg-green-500/10">
              <p className="text-sm text-ink/70">
                <span className="font-semibold text-heading">Log in as a provider</span> to see a
                personal match score for every task.
              </p>
              <Link
                href="/login?next=/tasks"
                className="shrink-0 rounded-full bg-green-900 px-4 py-2 text-xs font-semibold text-cream hover:bg-green-800"
              >
                Log in
              </Link>
            </div>
          )}

          {user && !loading && data?.viewer.hasProfile === false && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-500/40 bg-gold-100/50 px-4 py-3 dark:bg-gold-500/10">
              <p className="text-sm text-ink/70">
                Add your <span className="font-semibold text-heading">skills and city</span> to unlock
                match scores — right now the list is just chronological.
              </p>
              <Link
                href="/settings"
                className="shrink-0 rounded-full border border-gold-500 px-4 py-2 text-xs font-semibold text-gold-500 hover:bg-gold-500 hover:text-cream"
              >
                Complete profile
              </Link>
            </div>
          )}

          {loading && (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-line bg-card p-5">
                  <div className="mb-3 h-3 w-24 rounded bg-line/70" />
                  <div className="mb-2 h-5 w-3/4 rounded bg-line/70" />
                  <div className="mb-4 h-3 w-full rounded bg-line/50" />
                  <div className="h-8 w-32 rounded bg-line/60" />
                </div>
              ))}
            </div>
          )}

          {!loading && tasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-14 text-center">
              <p className="font-display text-2xl text-heading">No work matches that filter</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
                Try a wider search — clear the category, drop the budget filter, or switch to
                “Remote only”.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => {
                    setCategory("");
                    setMinBudget(0);
                    setRemoteOnly(false);
                    setQ("");
                  }}
                  className="rounded-full bg-green-900 px-5 py-2.5 text-sm text-cream hover:bg-green-800"
                >
                  Clear filters
                </button>
                <Link
                  href="/tools/new"
                  className="rounded-full border border-line px-5 py-2.5 text-sm text-ink/70 hover:border-green-800/40"
                >
                  List a service instead
                </Link>
              </div>
            </div>
          )}

          {/* Best match hero */}
          {!loading && top && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-500">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gold-500" />
                Best match for you
              </div>
              <Link
                href={`/tasks/${top.id}`}
                className="group block overflow-hidden rounded-2xl border border-green-900/25 bg-gradient-to-br from-green-950 to-green-800 p-5 text-cream shadow-[0_18px_50px_-30px_rgba(13,35,24,0.8)] transition-transform hover:-translate-y-0.5 sm:p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 sm:flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-cream/60">
                      <span className="rounded-full bg-cream/15 px-2 py-0.5">{categoryLabel(top.category)}</span>
                      <span>{top.city || "Remote"}</span>
                      <span>·</span>
                      <span>{ago(top.createdAt)}</span>
                      {top.applicantCount === 0 && (
                        <span className="rounded-full bg-gold-500/25 px-2 py-0.5 text-gold-100">
                          first to apply
                        </span>
                      )}
                    </div>
                    <h3 className="break-words font-display text-2xl leading-snug [overflow-wrap:anywhere]">
                      {top.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-cream/75">{top.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className="font-display text-2xl text-gold-400">
                        {formatMoney(top.budget, top.currency)}
                      </span>
                      <span className="text-cream/60">held in escrow before you start</span>
                    </div>
                  </div>
                  <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end">
                    <div className="rounded-xl bg-cream/10 px-3 py-2 text-center">
                      <p className="font-display text-2xl text-cream">{top.matchScore}<span className="text-sm text-cream/60">%</span></p>
                      <p className="text-[10px] uppercase tracking-wide text-cream/60">match</p>
                    </div>
                    <span className="rounded-full bg-cream px-4 py-2 text-xs font-semibold text-green-900">
                      View &amp; apply →
                    </span>
                  </div>
                </div>
                {top.matchReasons.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5 border-t border-cream/15 pt-3">
                    {top.matchReasons.map((r) => (
                      <span key={r} className="rounded-full bg-cream/10 px-2.5 py-1 text-[11px] text-cream/80">
                        ✓ {r}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </div>
          )}

          {/* Card grid */}
          {!loading && rest.length > 0 && (
            <div
              className={`grid gap-4 transition-opacity duration-200 md:grid-cols-2 ${
                refreshing ? "opacity-60" : ""
              }`}
            >
              {rest.map((t) => {
                const left = timeLeft(t.expiresAt);
                const fresh = Date.now() - new Date(t.createdAt).getTime() < 6 * 36e5;
                return (
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    className="group flex flex-col rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-green-800/40 hover:shadow-[0_14px_36px_-26px_rgba(13,35,24,0.6)]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wide">
                        <span className="rounded-full bg-green-950/5 px-2 py-0.5 font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
                          {categoryLabel(t.category)}
                        </span>
                        {fresh && (
                          <span className="flex items-center gap-1 rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-500 dark:bg-gold-500/15">
                            <span className="h-1 w-1 animate-pulse rounded-full bg-gold-500" /> new
                          </span>
                        )}
                        {t.postedByType === "ai_agent" && (
                          <span className="rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-500 dark:bg-gold-500/15">
                            🤖 AI client
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {t.matchScore !== null && <MatchRing score={t.matchScore} />}
                        <span onClick={(e) => e.preventDefault()}>
                          <SaveButton itemType="task" itemId={t.id} />
                        </span>
                      </div>
                    </div>

                    <h3 className="break-words font-display text-lg leading-snug text-heading [overflow-wrap:anywhere]">
                      {t.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-ink/60">{t.description}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/50">
                      <span>{t.city || "Remote"}</span>
                      <span>·</span>
                      <span>{ago(t.createdAt)}</span>
                      {left && (
                        <>
                          <span>·</span>
                          <span className={left === "Closed" ? "text-red-600" : "text-ink/60"}>{left}</span>
                        </>
                      )}
                      <span>·</span>
                      <span className={t.applicantCount === 0 ? "font-semibold text-green-800 dark:text-green-300" : ""}>
                        {t.applicantCount === 0
                          ? "no applicants yet"
                          : `${t.applicantCount} applied`}
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
                      <div>
                        <p className="font-display text-xl text-green-800 dark:text-green-300">
                          {formatMoney(t.budget, t.currency)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink/45">
                          {t.clientName || "Client"}
                          {t.clientVerified && <span title="ID verified">✔</span>}
                          {t.clientRating && t.clientRatingCount ? (
                            <span>· {Number(t.clientRating).toFixed(1)}★</span>
                          ) : null}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full border border-green-900/30 px-3.5 py-1.5 text-xs font-semibold text-green-800 transition-colors group-hover:bg-green-900 group-hover:text-cream dark:text-green-300 dark:group-hover:text-cream">
                        Apply
                      </span>
                    </div>

                    {t.matchReasons.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {t.matchReasons.map((r) => (
                          <span key={r} className="rounded-full bg-paper px-2 py-0.5 text-[10px] text-ink/50">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* cross-sell */}
          {!loading && tasks.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card/60 px-5 py-4">
              <div>
                <p className="font-semibold text-heading">Not seeing your kind of work?</p>
                <p className="text-sm text-ink/60">
                  List a fixed-price service in the Toolbox — clients order it directly, no bidding.
                </p>
              </div>
              <Link
                href="/tools/new"
                className="shrink-0 rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-cream hover:opacity-90"
              >
                List a service
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
