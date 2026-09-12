"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { CURRENCIES } from "@/lib/currency";

// Default the date picker to 7 days out — the poster can change it to
// anything from 1 hour up to 90 days from now (enforced again server-side).
function defaultExpiryLocal() {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  // toISOString gives UTC; datetime-local inputs want local wall-clock time.
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function quickPick(hoursFromNow: number) {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export default function NewTaskPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "delivery",
    budget: "",
    currency: "PKR",
    city: "",
    expiresAt: defaultExpiryLocal(),
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [idea, setIdea] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState("");
  const [copilotReasoning, setCopilotReasoning] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  async function handleCopilot(e: React.FormEvent) {
    e.preventDefault();
    setCopilotError("");
    setCopilotReasoning("");
    setCopilotLoading(true);
    try {
      const res = await fetch("/api/ai/copilot/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea, city: form.city || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCopilotError(data.error || "AI Copilot could not draft this. Try the manual form.");
        return;
      }
      const d = data.draft;
      setForm((prev) => ({
        ...prev,
        title: d.title,
        description: d.description,
        category: d.category,
        budget: String(d.suggestedBudgetPkr),
        currency: "PKR",
      }));
      setCopilotReasoning(
        `${d.reasoning} Suggested range: PKR ${d.budgetRangeLow}–${d.budgetRangeHigh}, ~${d.deliveryDays} day(s) delivery.`
      );
      setShowManualForm(true);
    } catch {
      setCopilotError("Could not connect to AI Copilot. Try the manual form.");
    } finally {
      setCopilotLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          budget: Number(form.budget),
          expiresAt: new Date(form.expiresAt).toISOString(),
        }),
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

        <div className="mb-8 rounded-xl border border-green-700/30 bg-green-50 dark:bg-green-950/20 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">✨</span>
            <h2 className="font-medium text-heading">AI Copilot</h2>
          </div>
          <p className="text-sm text-ink/60 mb-3">
            Type your idea in a line or two — even in Roman Urdu. AI will write the
            title, description, category, and a fair PKR budget for you.
          </p>
          <form onSubmit={handleCopilot} className="space-y-3">
            <textarea
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700 min-h-20"
              placeholder="e.g. mujhe apne laptop ki screen fix karwani hai, Lahore mein"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              required
            />
            {copilotError && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {copilotError}
              </p>
            )}
            <button
              type="submit"
              disabled={copilotLoading}
              className="rounded-full bg-green-900 text-cream px-5 py-2 text-sm hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              {copilotLoading ? "Drafting..." : "Draft with AI"}
            </button>
          </form>
        </div>

        {copilotReasoning && (
          <p className="text-sm text-ink/60 bg-card border border-line rounded-lg px-4 py-2.5 mb-4">
            💡 {copilotReasoning}
          </p>
        )}

        {!showManualForm && (
          <button
            type="button"
            onClick={() => setShowManualForm(true)}
            className="text-sm text-ink/50 underline mb-6 block"
          >
            Skip AI, fill the form manually
          </button>
        )}

        <form
          onSubmit={handleSubmit}
          className={`space-y-4 ${showManualForm ? "" : "hidden"}`}
        >
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
              <label className="block text-sm mb-1">Budget</label>
              <div className="flex gap-2">
                <select
                  className="border border-line rounded-lg px-2 py-2.5 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
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

          <div>
            <label className="block text-sm mb-1">Active until</label>
            <p className="text-xs text-ink/50 mb-2">
              Your task closes itself automatically once this date passes.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { label: "1 day", hours: 24 },
                { label: "3 days", hours: 72 },
                { label: "7 days", hours: 168 },
                { label: "30 days", hours: 720 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() =>
                    setForm({ ...form, expiresAt: quickPick(opt.hours) })
                  }
                  className="rounded-full border border-line px-3 py-1 text-xs hover:border-green-700 hover:text-green-700 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <input
              type="datetime-local"
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={form.expiresAt}
              min={quickPick(1)}
              max={quickPick(90 * 24)}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              required
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
