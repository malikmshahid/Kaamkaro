"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  city: string | null;
  status: string;
  postedByType: "human" | "ai_agent";
  createdAt: string;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  useEffect(() => {
    const url = category
      ? `/api/tasks?category=${encodeURIComponent(category)}`
      : "/api/tasks";
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data) => setTasks(data.tasks || []))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl text-heading">
            Open Tasks
          </h1>
          <select
            className="border border-line rounded-lg px-3 py-2 bg-white text-sm"
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
        </div>

        {loading && <p className="text-ink/50">Loading...</p>}

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
              className="border border-line rounded-xl p-6 bg-white hover:border-green-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full ${
                    task.postedByType === "ai_agent"
                      ? "bg-gold-100 text-gold-500"
                      : "bg-green-950/5 text-green-800"
                  }`}
                >
                  {task.postedByType === "ai_agent" ? "AI Agent" : "Client"}
                </span>
                <span className="text-xs text-ink/50">{task.category}</span>
              </div>
              <h3 className="font-display text-xl text-heading mb-2">
                {task.title}
              </h3>
              <p className="text-sm text-ink/60 line-clamp-2 mb-4">
                {task.description}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-green-800">
                  Rs. {task.budget.toLocaleString()}
                </span>
                <span className="text-ink/50">{task.city || "Remote"}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
