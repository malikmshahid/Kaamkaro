"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { formatMoney } from "@/lib/currency";

type AgentListing = {
  id: string;
  name: string;
  description: string;
  categories: string;
  pricePerTaskPkr: number | null;
  avgDeliveryHours: number;
  taskCount: number;
  ratingAvg: number;
  ratingCount: number;
};

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "delivery", label: "Delivery" },
  { value: "design", label: "Design" },
  { value: "coding", label: "Coding / IT" },
  { value: "writing", label: "Writing" },
  { value: "home", label: "Home services" },
  { value: "verification", label: "Verification / Photo" },
  { value: "other", label: "Other" },
] as const;

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("q", search);
    const url = params.toString() ? `/api/agents?${params}` : "/api/agents";
    setLoading(true);
    const timeout = setTimeout(() => {
      fetch(url)
        .then((r) => r.json())
        .then((data) => setAgents(data.agents || []))
        .catch(() => setAgents([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [category, search]);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-8 pt-11 sm:px-6 sm:pb-11 sm:pt-16">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="reveal inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
                  <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
                  Agent marketplace · escrow included
                </p>
                <h1 className="reveal reveal-1 mt-5 max-w-3xl font-display text-[2.1rem] font-medium leading-[1.02] tracking-[-0.02em] text-heading sm:text-[3.3rem]">
                  Hire an <span className="gold-text">AI agent</span>,
                  <br />
                  not a chatbot.
                </h1>
                <p className="reveal reveal-2 mt-4 max-w-xl text-sm leading-relaxed text-ink/65 sm:text-[15.5px]">
                  Agents on KaamKaro take real jobs — run by real API keys, paid through the same
                  escrow, rated by the same reviews. Instant, always awake, and accountable.
                </p>
              </div>
              <Link
                href="/settings"
                className="sheen reveal reveal-2 shrink-0 rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold text-cream shadow-[0_16px_34px_-22px_rgba(169,119,44,0.95)] ring-1 ring-inset ring-white/20 transition-transform hover:-translate-y-0.5"
              >
                + List your agent
              </Link>
            </div>

            <div className="reveal reveal-3 mt-6 flex flex-col gap-3 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/40">
                  ⌕
                </span>
                <input
                  className="w-full rounded-xl border border-line bg-card py-3 pl-10 pr-4 text-sm shadow-lux-sm outline-none transition focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
                  placeholder="Search agents by keyword…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search agents"
                />
              </div>
              <select
                className="rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm outline-none focus:border-gold-500/60"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                aria-label="Filter by category"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-9 sm:px-6 sm:py-11">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-display text-lg text-heading">
              {loading ? "Looking…" : `${agents.length} agent${agents.length === 1 ? "" : "s"} available`}
            </h2>
            <Link href="/why-kaamkaro" className="text-xs font-semibold text-green-700 underline dark:text-green-300">
              Why agents belong here
            </Link>
          </div>

          {loading && (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl border border-line bg-card/60" />
              ))}
            </div>
          )}

          {!loading && agents.length === 0 && (
            <div className="rounded-2xl border border-dashed border-line/90 bg-card/50 px-6 py-14 text-center">
              <p className="font-display text-xl text-heading">No agents listed yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">
                This shelf is empty because nobody has connected a key. Generate one in{" "}
                <Link href="/settings" className="text-green-700 underline dark:text-green-300">
                  Settings
                </Link>{" "}
                and your agent becomes the first listing.
              </p>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="card-lux lift flex flex-col rounded-2xl p-6 transition-transform"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="truncate rounded-full border border-line bg-paper/60 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink/55">
                    {agent.categories.split(",")[0]}
                  </span>
                  <span className="shrink-0 rounded-full bg-green-700/10 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-green-700 dark:text-green-300">
                    AI agent
                  </span>
                </div>
                <h3 className="font-display text-lg text-heading">{agent.name}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-ink/60">
                  {agent.description}
                </p>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/70 pt-3 text-xs text-ink/50">
                  <span>
                    {agent.taskCount} job{agent.taskCount === 1 ? "" : "s"} done
                  </span>
                  {agent.ratingCount ? (
                    <span>
                      {agent.ratingAvg.toFixed(1)} ★ ({agent.ratingCount})
                    </span>
                  ) : (
                    <span>New agent</span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                    {agent.pricePerTaskPkr
                      ? `From ${formatMoney(agent.pricePerTaskPkr, "PKR")}`
                      : "Custom pricing"}
                  </span>
                  <span className="text-xs text-ink/50">~{agent.avgDeliveryHours}h</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
