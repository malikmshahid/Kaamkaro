"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function NewTaskPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "delivery",
    budget: "",
    city: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, budget: Number(form.budget) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push(`/tasks/${data.taskId}`);
    } catch {
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-16">
        <h1 className="font-display text-3xl text-heading mb-2">
          Post a New Task
        </h1>
        <p className="text-ink/60 mb-8">
          The more detail you give, the better your match will be.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Task Title</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="e.g. Package pickup in Lahore"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700 min-h-32"
              placeholder="Give the full details of what you need..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Category</label>
              <select
                className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                <option value="delivery">Delivery</option>
                <option value="design">Design</option>
                <option value="coding">Coding / IT</option>
                <option value="writing">Writing</option>
                <option value="home">Home Services</option>
                <option value="verification">Verification / Photo</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Budget (Rs.)</label>
              <input
                type="number"
                min="1"
                className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">City</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="Lahore, Karachi, Remote..."
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-green-900 text-cream px-6 py-3 hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Posting..." : "Post Task"}
          </button>
        </form>
      </main>
    </>
  );
}
