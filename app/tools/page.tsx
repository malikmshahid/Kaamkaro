"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import SaveButton from "@/components/SaveButton";
import { formatMoney } from "@/lib/currency";
import { CATEGORIES, categoryLabel } from "@/lib/constants";
import { useUser } from "@/lib/useUser";

type Tool = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  deliveryDays: number;
  city: string | null;
  orderCount: number;
  createdAt: string;
  providerId: string;
  providerName: string | null;
  providerCity: string | null;
  providerRating: number | null;
  providerRatingCount: number | null;
  providerVerified: boolean | null;
  providerCompleted: number | null;
  recommendScore: number;
};

type Payload = {
  tools: Tool[];
  facets: { categories: Record<string, number> };
  stats: { active: number; providers: number; orders: number; fastest: number; cheapest: number; mine: number };
};

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "popular", label: "Most ordered" },
  { value: "price_low", label: "Price: low to high" },
  { value: "price_high", label: "Price: high to low" },
  { value: "fastest", label: "Fastest delivery" },
  { value: "newest", label: "Newest" },
] as const;

const PRICE_CAPS = [
  { value: 0, label: "Any price" },
  { value: 1000, label: "Under Rs 1,000" },
  { value: 3000, label: "Under Rs 3,000" },
  { value: 10000, label: "Under Rs 10,000" },
];

const DAY_CAPS = [
  { value: 0, label: "Any time" },
  { value: 1, label: "24 hours" },
  { value: 3, label: "3 days" },
  { value: 7, label: "1 week" },
];

function Stars({ rating, count }: { rating: number | null; count: number | null }) {
  if (!count) {
    return <span className="text-[11px] text-ink/40">No reviews yet</span>;
  }
  const r = Number(rating || 0);
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-ink/60">
      <span className="text-gold-500">
        {"★".repeat(Math.round(r))}
        <span className="text-line">{"★".repeat(Math.max(0, 5 - Math.round(r)))}</span>
      </span>
      <span className="font-semibold text-ink/70">{r.toFixed(1)}</span>
      <span className="text-ink/40">({count})</span>
    </span>
  );
}

function deliveryLabel(days: number) {
  if (days <= 1) return "24 hours";
  if (days === 7) return "1 week";
  return `${days} days`;
}

export default function ToolboxPage() {
  const { user } = useUser();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadedOnce = useRef(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<string>("recommended");
  const [maxPrice, setMaxPrice] = useState(0);
  const [maxDays, setMaxDays] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (sort) params.set("sort", sort);
    if (maxPrice) params.set("maxPrice", String(maxPrice));
    if (maxDays) params.set("maxDays", String(maxDays));
    if (loadedOnce.current) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch(`/api/toolbox?${params.toString()}`, { cache: "no-store" });
      setData(await res.json());
      loadedOnce.current = true;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q, category, sort, maxPrice, maxDays]);

  // Read shareable filters from the URL on first paint (/tools?category=design&maxPrice=3000)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const c = sp.get("category") || "";
    const qp = sp.get("q") || "";
    const sp2 = sp.get("sort");
    const mp = Number(sp.get("maxPrice") || 0);
    const md = Number(sp.get("maxDays") || 0);
    if (c) setCategory(c);
    if (qp) setQ(qp);
    if (sp2) setSort(sp2);
    if (mp > 0) setMaxPrice(mp);
    if (md > 0) setMaxDays(md);
    setHydrated(true);
  }, []);

  // Keep the URL in sync so the current view can be shared or bookmarked
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (sort && sort !== "recommended") params.set("sort", sort);
    if (maxPrice) params.set("maxPrice", String(maxPrice));
    if (maxDays) params.set("maxDays", String(maxDays));
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `/tools?${qs}` : "/tools");
  }, [hydrated, q, category, sort, maxPrice, maxDays]);

  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load, hydrated]);

  const tools = data?.tools || [];
  const stats = data?.stats;
  const categories = CATEGORIES.filter(
    (c) => (data?.facets.categories[c.value] || 0) > 0 || category === c.value
  );
  const filtersOn = Boolean(q || category || maxPrice || maxDays);
  const spotlight = useMemo(() => {
    if (sort !== "recommended" || tools.length === 0) return null;
    const best = tools[0];
    // Only promote a listing when it has something real behind it.
    return best.orderCount > 0 || (best.providerRatingCount ?? 0) > 0 ? best : null;
  }, [tools, sort]);
  const rest = spotlight ? tools.slice(1) : tools;

  function clearAll() {
    setQ("");
    setCategory("");
    setMaxPrice(0);
    setMaxDays(0);
  }

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
                "radial-gradient(55% 60% at 90% 0%, rgba(200,150,62,0.18) 0%, rgba(200,150,62,0) 62%), radial-gradient(45% 55% at 2% 100%, rgba(18,58,38,0.10) 0%, rgba(18,58,38,0) 65%)",
            }}
          />
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full border border-gold-500/40 bg-gold-100/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-500 dark:bg-gold-500/10">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
                  The Toolbox · fixed price
                </p>
                <h1 className="mt-4 max-w-2xl font-display text-3xl leading-tight text-heading sm:text-5xl">
                  Order it done. No bidding, no waiting.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65 sm:text-base">
                  Ready-made services from Pakistani providers with a price and a deadline already
                  on the table. Tap once, the job is yours — payment stays in escrow until you
                  confirm the work.
                </p>
              </div>
              <Link
                href="/tools/new"
                className="shrink-0 rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-cream transition-transform hover:-translate-y-0.5 hover:opacity-95"
              >
                + List a service
              </Link>
            </div>

            {/* search + sort */}
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
                  aria-label="Search services"
                  placeholder="Search services — 'logo', 'AC service', 'resume'…"
                  className="w-full rounded-full border border-line bg-card py-3 pl-11 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                />
              </div>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort services by"
                className="min-w-0 rounded-full border border-line bg-card px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-green-700 sm:w-52"
              >
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* filter chips */}
            <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              <button
                onClick={() => setCategory("")}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  category === ""
                    ? "border-green-900 bg-green-900 text-cream"
                    : "border-line bg-card text-ink/70 hover:border-green-800/40"
                }`}
              >
                All services
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
            </div>
            <div className="-mx-5 mt-2 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {PRICE_CAPS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setMaxPrice(maxPrice === p.value ? 0 : p.value)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    maxPrice === p.value
                      ? "border-gold-500 bg-gold-500 text-cream"
                      : "border-line bg-card text-ink/70 hover:border-gold-500/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <span className="mx-1 hidden w-px shrink-0 bg-line sm:block" />
              {DAY_CAPS.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setMaxDays(maxDays === d.value ? 0 : d.value)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    maxDays === d.value
                      ? "border-green-900 bg-green-900 text-cream"
                      : "border-line bg-card text-ink/70 hover:border-green-800/40"
                  }`}
                >
                  ⚡ {d.label}
                </button>
              ))}
              {filtersOn && (
                <button
                  onClick={clearAll}
                  className="shrink-0 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold text-ink/50 hover:text-red-600"
                >
                  Clear ×
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ------------------------------ STATS ------------------------------- */}
        <section className="border-b border-line bg-card/40">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-px px-5 sm:grid-cols-4 sm:px-6">
            {[
              { label: "Services ready to order", value: stats ? stats.active.toLocaleString() : "—" },
              { label: "Providers selling", value: stats ? stats.providers.toLocaleString() : "—" },
              {
                label: "Orders placed here",
                value: stats ? stats.orders.toLocaleString() : "—",
              },
              {
                label: user ? "Your active listings" : "Fastest delivery",
                value: stats
                  ? user
                    ? stats.mine.toLocaleString()
                    : stats.fastest
                      ? deliveryLabel(stats.fastest)
                      : "—"
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
              {loading
                ? "Opening the toolbox…"
                : `${tools.length} service${tools.length === 1 ? "" : "s"} you can order`}
              {refreshing && !loading && (
                <span className="inline-flex items-center gap-1.5 text-xs font-normal text-ink/40">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-500" />
                  updating
                </span>
              )}
            </h2>
            {!loading && (
              <p className="text-xs text-ink/45">
                Sorted by{" "}
                <span className="font-semibold text-ink/70">
                  {SORTS.find((s) => s.value === sort)?.label}
                </span>
              </p>
            )}
          </div>

          {loading && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-line bg-card p-5">
                  <div className="mb-3 h-3 w-20 rounded bg-line/70" />
                  <div className="mb-2 h-5 w-3/4 rounded bg-line/70" />
                  <div className="mb-4 h-3 w-full rounded bg-line/50" />
                  <div className="h-8 w-28 rounded bg-line/60" />
                </div>
              ))}
            </div>
          )}

          {!loading && tools.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line bg-card/50 px-6 py-14 text-center">
              <p className="font-display text-2xl text-heading">
                {filtersOn ? "Nothing matches those filters" : "The Toolbox is waiting for its first service"}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
                {filtersOn
                  ? "Try widening the price or delivery filter — or clear them all."
                  : "If you can do a job to a fixed price, list it here. Clients order it instantly, no bidding."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {filtersOn ? (
                  <button
                    onClick={clearAll}
                    className="rounded-full bg-green-900 px-5 py-2.5 text-sm text-cream hover:bg-green-800"
                  >
                    Clear filters
                  </button>
                ) : (
                  <Link
                    href="/tools/new"
                    className="rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-cream hover:opacity-90"
                  >
                    List your first service
                  </Link>
                )}
                <Link
                  href="/tasks"
                  className="rounded-full border border-line px-5 py-2.5 text-sm text-ink/70 hover:border-green-800/40"
                >
                  Browse open tasks instead
                </Link>
              </div>
            </div>
          )}

          {/* spotlight */}
          {!loading && spotlight && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-500">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gold-500" />
                Most trusted listing right now
              </div>
              <Link
                href={`/tools/${spotlight.id}`}
                className="group flex flex-col gap-4 rounded-2xl border border-green-900/25 bg-gradient-to-br from-green-950 to-green-800 p-5 text-cream transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-cream/60">
                    <span className="rounded-full bg-cream/15 px-2 py-0.5">
                      {categoryLabel(spotlight.category)}
                    </span>
                    <span>{spotlight.city || "Remote"}</span>
                    <span className="rounded-full bg-gold-500/25 px-2 py-0.5 text-gold-100">
                      ⚡ {deliveryLabel(spotlight.deliveryDays)}
                    </span>
                  </div>
                  <h3 className="break-words font-display text-2xl leading-snug [overflow-wrap:anywhere]">
                    {spotlight.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm text-cream/75">
                    {spotlight.description}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-cream/70">
                    <span className="font-semibold text-cream">{spotlight.providerName || "Provider"}</span>
                    {spotlight.providerVerified && <span title="ID verified">✔</span>}
                    <Stars rating={spotlight.providerRating} count={spotlight.providerRatingCount} />
                    {spotlight.providerCompleted ? (
                      <span>· {spotlight.providerCompleted} jobs done here</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <div className="text-left sm:text-right">
                    <p className="font-display text-2xl text-gold-400">
                      {formatMoney(spotlight.price, spotlight.currency)}
                    </p>
                    <p className="text-[11px] text-cream/60">fixed price · escrow</p>
                  </div>
                  <span className="rounded-full bg-cream px-4 py-2 text-xs font-semibold text-green-900">
                    Order now →
                  </span>
                </div>
              </Link>
            </div>
          )}

          {/* grid */}
          {!loading && rest.length > 0 && (
            <div
              className={`grid grid-cols-1 gap-4 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-3 ${
                refreshing ? "opacity-60" : ""
              }`}
            >
              {rest.map((t) => {
                const fresh = Date.now() - new Date(t.createdAt ?? 0).getTime() < 7 * 864e5;
                return (
                  <Link
                    key={t.id}
                    href={`/tools/${t.id}`}
                    className="group flex flex-col rounded-2xl border border-line bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-gold-500/50 hover:shadow-[0_14px_36px_-26px_rgba(13,35,24,0.6)]"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] uppercase tracking-wide">
                        <span className="rounded-full bg-green-950/5 px-2 py-0.5 font-semibold text-green-800 dark:bg-green-500/15 dark:text-green-300">
                          {categoryLabel(t.category)}
                        </span>
                        {fresh && (
                          <span className="rounded-full bg-gold-100 px-2 py-0.5 font-semibold text-gold-500 dark:bg-gold-500/15">
                            new
                          </span>
                        )}
                      </div>
                      <span onClick={(e) => e.preventDefault()} className="shrink-0">
                        <SaveButton itemType="tool" itemId={t.id} />
                      </span>
                    </div>

                    <h3 className="break-words font-display text-lg leading-snug text-heading [overflow-wrap:anywhere]">
                      {t.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-ink/60">{t.description}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-ink/50">
                      <span className="inline-flex items-center gap-1 font-medium text-ink/70">
                        ⚡ {deliveryLabel(t.deliveryDays)}
                      </span>
                      <span>·</span>
                      <span>{t.city || "Remote"}</span>
                      {t.orderCount > 0 && (
                        <>
                          <span>·</span>
                          <span>{t.orderCount} ordered</span>
                        </>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-heading">
                          {t.providerName || "Provider"}
                          {t.providerVerified ? <span className="ml-1 text-green-800 dark:text-green-300">✔</span> : null}
                        </p>
                        <Stars rating={t.providerRating} count={t.providerRatingCount} />
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-lg text-green-800 dark:text-green-300">
                          {formatMoney(t.price, t.currency)}
                        </p>
                        <span className="mt-0.5 inline-block rounded-full border border-green-900/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-800 transition-colors group-hover:bg-green-900 group-hover:text-cream dark:text-green-300 dark:group-hover:text-cream">
                          Order
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* cross-sell */}
          {!loading && tools.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card/60 px-5 py-4">
              <div>
                <p className="font-semibold text-heading">Can&apos;t find the exact service?</p>
                <p className="text-sm text-ink/60">
                  Post it as a task and let providers send priced proposals instead.
                </p>
              </div>
              <Link
                href="/tasks/new"
                className="shrink-0 rounded-full bg-green-900 px-5 py-2.5 text-sm font-semibold text-cream hover:bg-green-800"
              >
                Post a task
              </Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
