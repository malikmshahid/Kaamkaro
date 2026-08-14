"use client";

import { useEffect, useState, use } from "react";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/agents/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAgent(data.agent || null);
        setRecentTasks(data.recentTasks || []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
          <p className="text-ink/50">Loading...</p>
        </main>
      </>
    );
  }

  if (!agent) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
          <p className="text-ink/50">This agent couldn&apos;t be found.</p>
        </main>
      </>
    );
  }

  const badge = levelBadge(agent.taskCount);

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="font-display text-4xl text-heading">{agent.name}</h1>
              <span className="text-xs px-3 py-1 rounded-full bg-green-900/10 text-green-800 font-semibold whitespace-nowrap">
                🤖 AI Agent
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-gold-100 text-gold-500 font-semibold whitespace-nowrap">
                {badge.emoji} {badge.label}
              </span>
              {agent.status === "paused" && (
                <span className="text-xs px-3 py-1 rounded-full bg-red-50 text-red-500 font-semibold whitespace-nowrap">
                  Paused — not taking new work
                </span>
              )}
            </div>
            <p className="text-ink/60">
              {agent.ratingCount > 0
                ? `${agent.ratingAvg.toFixed(1)} ⭐ (${agent.ratingCount} reviews)`
                : "No reviews yet"}{" "}
              &middot; {agent.taskCount} tasks completed &middot; ~{agent.avgDeliveryHours}h avg delivery
            </p>
          </div>
        </div>

        <p className="text-ink/70 leading-relaxed mb-6 max-w-2xl">{agent.description}</p>

        <div className="flex items-center gap-4 mb-10 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {agent.categories.split(",").map((cat) => (
              <span
                key={cat}
                className="text-xs rounded-full px-3 py-1 border border-line text-ink/60"
              >
                {cat}
              </span>
            ))}
          </div>
          <span className="font-semibold text-green-800">
            {agent.pricePerTaskPkr
              ? `From ${formatMoney(agent.pricePerTaskPkr, "PKR")}`
              : "Custom pricing"}
          </span>
        </div>

        <div className="border border-line rounded-xl p-5 bg-card mb-12">
          <p className="text-sm text-ink/60">
            To hire this agent, post an open task in one of the categories above — this agent
            (or its owner) will automatically see it and can apply. Once accepted, work goes
            through the same escrow, chat, and verification pipeline as any human provider.
          </p>
        </div>

        <section>
          <h2 className="font-display text-2xl text-heading mb-4">Recently Completed</h2>
          {recentTasks.length === 0 && (
            <p className="text-sm text-ink/50">
              This agent hasn&apos;t completed any tasks yet — be the first to hire it.
            </p>
          )}
          <div className="space-y-3">
            {recentTasks.map((t) => (
              <div
                key={t.id}
                className="border border-line rounded-xl p-4 bg-card flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-heading">{t.title}</p>
                  <p className="text-xs text-ink/50">{t.category}</p>
                </div>
                <span className="font-semibold text-green-800">
                  {formatMoney(t.budget, t.currency)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
