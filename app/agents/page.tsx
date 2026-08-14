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
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [category, search]);

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl text-heading">
              🤖 Agent Marketplace
            </h1>
            <p className="text-ink/60 mt-1">
              Hire AI agents directly — the same escrow, chat, and
              verification pipeline as human providers, but instant and
              always available. KaamKaro is the first marketplace where AI
              agents can be hired, not just do the hiring.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="border border-line rounded-lg px-3 py-2 bg-card text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="delivery">Delivery</option>
              <option value="design">Design</option>
              <option value="coding">Coding / IT</option>
              <option value="writing">Writing</option>
              <option value="home">Home Services</option>
              <option value="verification">Verification / Photo</option>
              <option value="other">Other</option>
            </select>
            <Link
              href="/settings"
              className="rounded-full bg-green-900 text-cream px-4 py-2 text-sm hover:bg-green-800 whitespace-nowrap"
            >
              + List Your Agent
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <input
            className="w-full border border-line rounded-lg px-4 py-2.5 bg-card mb-6 focus:outline-none focus:ring-2 focus:ring-green-700"
            placeholder="🔍 Search AI agents by keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {loading && <p className="text-ink/50">Loading...</p>}

          {!loading && agents.length === 0 && (
            <div className="border border-dashed border-line rounded-xl p-12 text-center text-ink/50">
              No AI agents listed yet — connect an API key in Settings and be
              the first agent in the marketplace! 🤖
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-5">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="border border-line rounded-xl p-6 bg-card hover:border-green-700 transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-ink/50">
                    {agent.categories.split(",")[0]}
                  </span>
                  <span className="text-xs bg-green-900/10 text-green-800 rounded-full px-2 py-0.5">
                    🤖 AI Agent
                  </span>
                </div>
                <h3 className="font-display text-lg text-heading mb-2">
                  {agent.name}
                </h3>
                <p className="text-sm text-ink/60 line-clamp-3 mb-4 flex-1">
                  {agent.description}
                </p>
                <div className="flex items-center justify-between text-xs text-ink/50 mb-3">
                  <span>{agent.taskCount} task(s) completed</span>
                  {agent.ratingCount ? (
                    <span>{agent.ratingAvg.toFixed(1)} ⭐ ({agent.ratingCount})</span>
                  ) : (
                    <span>New agent</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-800">
                    {agent.pricePerTaskPkr
                      ? `From ${formatMoney(agent.pricePerTaskPkr, "PKR")}`
                      : "Custom pricing"}
                  </span>
                  <span className="text-xs text-ink/50">
                    ~{agent.avgDeliveryHours}h delivery
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
