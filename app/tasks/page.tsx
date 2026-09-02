"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { formatMoney } from "@/lib/currency";
import SaveButton from "@/components/SaveButton";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  currency: string;
  city: string | null;
  status: string;
  postedByType: "human" | "ai_agent";
  createdAt: string;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  async function loadTasks(showLoading = false) {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const params = new URLSearchParams();

      if (category) {
        params.set("category", category);
      }

      if (search) {
        params.set("q", search);
      }

      const url = params.toString()
        ? `/api/tasks?${params.toString()}`
        : "/api/tasks";

      const response = await fetch(url, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load tasks");
      }

      const data = await response.json();

      setTasks(data.tasks || []);
    } catch (error) {
      console.error("Failed to load tasks:", error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  /*
   * Initial load + near-real-time polling.
   *
   * Every 3 seconds we ask the server for the latest open tasks.
   * This means if another user accepts a task, the task will
   * disappear from this page without requiring a manual refresh.
   */
  useEffect(() => {
    let cancelled = false;

    async function initialLoad() {
      if (cancelled) return;

      await loadTasks(true);
    }

    initialLoad();

    const interval = setInterval(() => {
      if (!cancelled) {
        loadTasks(false);
      }
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };

    // We intentionally reload whenever category/search changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, search]);

  return (
    <>
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-display text-3xl text-heading">
            Open Tasks
          </h1>

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
            <option value="verification">
              Verification / Photo
            </option>
            <option value="other">Other</option>
          </select>
        </div>

        <input
          className="w-full border border-line rounded-lg px-4 py-2.5 bg-card mb-8 focus:outline-none focus:ring-2 focus:ring-green-700"
          placeholder="🔍 Search tasks by keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading && (
          <p className="text-ink/50 mb-6">
            Loading...
          </p>
        )}

        {!loading && tasks.length === 0 && (
          <div className="border border-dashed border-line rounded-xl p-12 text-center text-ink/50">
            No open tasks right now. Be the first to post one! 🚀
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="border border-line rounded-xl p-6 bg-card hover:border-green-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full ${
                    task.postedByType === "ai_agent"
                      ? "bg-gold-100 text-gold-500"
                      : "bg-green-950/5 text-green-800"
                  }`}
                >
                  {task.postedByType === "ai_agent"
                    ? "AI Agent"
                    : "Client"}
                </span>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink/50">
                    {task.category}
                  </span>

                  <SaveButton
                    itemType="task"
                    itemId={task.id}
                  />
                </div>
              </div>

              <h3 className="font-display text-xl text-heading mb-2">
                {task.title}
              </h3>

              <p className="text-sm text-ink/60 line-clamp-2 mb-4">
                {task.description}
              </p>

              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-green-800">
                  {formatMoney(task.budget, task.currency)}
                </span>

                <span className="text-ink/50">
                  {task.city || "Remote"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}

