"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { CURRENCIES } from "@/lib/currency";
import PriceFairness from "@/components/PriceFairness";
import { usePublicPlatformSettings } from "@/lib/usePublicPlatformSettings";

// Default the date picker to 7 days out — the poster can change it to
// anything from 1 hour up to 90 days from now (enforced again server-side).
function defaultExpiryLocal(days = 7) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
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
  const platformSettings = usePublicPlatformSettings();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "delivery",
    budget: "",
    currency: "PKR",
    city: "",
    expiresAt: defaultExpiryLocal(),
  });
  const [deliverables, setDeliverables] = useState<string[]>([""]);
  const [currencyTouched, setCurrencyTouched] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [idea, setIdea] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState("");
  const [copilotReasoning, setCopilotReasoning] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);

  const enabledCategories = platformSettings.marketplace.enabledCategories;
  const selectedCategory = enabledCategories.includes(form.category) ? form.category : enabledCategories[0] || "other";
  const selectedCurrency = currencyTouched ? form.currency : platformSettings.marketplace.defaultCurrency;

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
      setCurrencyTouched(true);
      setForm((prev) => ({
        ...prev,
        title: d.title,
        description: d.description,
        category: enabledCategories.includes(d.category) ? d.category : selectedCategory,
        budget: String(d.suggestedBudgetPkr),
        currency: "PKR",
        city: prev.city || d.city || "",
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
          deliverables: deliverables.map((item) => item.trim()).filter(Boolean),
          category: selectedCategory,
          currency: selectedCurrency,
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
      <main className="flex-1">
        <div className="aurora grain relative isolate overflow-hidden">
          <div className="relative mx-auto w-full max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
              Free to post · escrow protected
            </p>
            <h1 className="mt-5 font-display text-[2.1rem] font-medium leading-[1.04] tracking-[-0.02em] text-heading sm:text-[2.8rem]">
              Post a new task
            </h1>
            <p className="mt-3 max-w-lg leading-relaxed text-ink/65">
              The more detail you give, the better your match will be.
            </p>

        {platformSettings.aiFeatures.taskCopilotEnabled && <div className="card-lux relative mt-8 overflow-hidden p-5 sm:p-6">
          <div className="gold-hairline absolute inset-x-5 top-0" aria-hidden="true" />
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-green-950/[0.06] text-green-800 dark:bg-green-500/15 dark:text-green-300">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3l1.9 4.9L19 9.8l-4.1 1.9L12 17l-1.9-5.3L6 9.8l5.1-1.9L12 3Z" />
                <path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z" />
              </svg>
            </span>
            <h2 className="font-display text-[1.15rem] text-heading">AI Copilot</h2>
          </div>
          <p className="mb-3 text-sm leading-relaxed text-ink/60">
            Type your idea in a line or two — even in Roman Urdu. AI will write the
            title, description, category, and a fair PKR budget for you.
          </p>
          <form onSubmit={handleCopilot} className="space-y-3">
            <textarea
              className="min-h-20 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
              placeholder="e.g. mujhe apne laptop ki screen fix karwani hai, Lahore mein"
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              required
            />
            {copilotError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {copilotError}
              </p>
            )}
            <button
              type="submit"
              disabled={copilotLoading}
              className="rounded-full bg-green-900 px-5 py-2.5 text-sm font-semibold text-cream shadow-lux-sm transition-all hover:-translate-y-0.5 hover:bg-green-800 disabled:translate-y-0 disabled:opacity-50"
            >
              {copilotLoading ? "Drafting..." : "Draft with AI"}
            </button>
          </form>
        </div>}

        {copilotReasoning && (
          <p className="mb-4 rounded-xl border border-gold-500/25 bg-gold-100/40 px-4 py-2.5 text-sm text-ink/70 dark:bg-gold-500/10">
            💡 {copilotReasoning}
          </p>
        )}

        {!showManualForm && (
          <button
            type="button"
            onClick={() => setShowManualForm(true)}
            className="mb-6 block text-sm font-medium text-ink/50 underline decoration-line underline-offset-4 transition-colors hover:text-green-800"
          >
            {platformSettings.aiFeatures.taskCopilotEnabled ? "Skip AI, fill the form manually" : "Fill in the task details"}
          </button>
        )}

        <form
          onSubmit={handleSubmit}
          className={`space-y-4 ${showManualForm ? "" : "hidden"}`}
        >
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Task Title</label>
            <input
              className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
              placeholder="e.g. Package pickup in Lahore"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Description</label>
            <textarea
              className="min-h-32 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
              placeholder="Give the full details of what you need..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />
          </div>
          <section className="rounded-2xl border border-line bg-card/70 p-4 shadow-lux-sm sm:p-5" aria-labelledby="deliverables-heading">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="deliverables-heading" className="text-sm font-semibold text-heading">What should be delivered?</h2>
                <p className="mt-1 max-w-lg text-xs leading-relaxed text-ink/55">
                  Optional. Add up to 6 clear outcomes so providers know what to include and you know what to review.
                </p>
              </div>
              <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-ink/50">{deliverables.length}/6</span>
            </div>
            <div className="mt-4 space-y-2.5">
              {deliverables.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-900/8 text-xs font-semibold text-green-800 dark:bg-green-400/10 dark:text-green-300">{index + 1}</span>
                  <input
                    type="text"
                    maxLength={140}
                    value={item}
                    onChange={(event) => setDeliverables((current) => current.map((value, i) => i === index ? event.target.value : value))}
                    className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm shadow-sm placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/30"
                    placeholder={index === 0 ? "e.g. Final logo files in PNG and SVG" : "Add another deliverable"}
                    aria-label={`Deliverable ${index + 1}`}
                  />
                  {deliverables.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDeliverables((current) => current.filter((_, i) => i !== index))}
                      className="shrink-0 rounded-lg px-2 py-2 text-xs text-ink/45 transition-colors hover:bg-red-50 hover:text-red-700"
                      aria-label={`Remove deliverable ${index + 1}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {deliverables.length < 6 && (
              <button
                type="button"
                onClick={() => setDeliverables((current) => [...current, ""])}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-2 text-xs font-medium text-ink/65 transition-colors hover:border-green-800/40 hover:text-green-800"
              >
                <span aria-hidden="true" className="text-base leading-none">+</span> Add deliverable
              </button>
            )}
          </section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Category</label>
              <select
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
                value={selectedCategory}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                {platformSettings.categories.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Budget</label>
              <div className="flex gap-2">
                <select
                  className="border border-line rounded-lg px-2 py-2.5 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
                  value={selectedCurrency}
                  onChange={(e) => { setCurrencyTouched(true); setForm({ ...form, currency: e.target.value }); }}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={platformSettings.marketplace.minTaskBudget}
                  max={platformSettings.marketplace.maxTaskBudget}
                  placeholder={`${platformSettings.marketplace.minTaskBudget}–${platformSettings.marketplace.maxTaskBudget.toLocaleString()}`}
                  className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <PriceFairness
                category={form.category}
                city={form.city}
                amount={Number(form.budget) || null}
              />
              <p className="mt-1.5 text-[11px] text-ink/40">
                Based on real budgets on SafarWorks. Platform bounds: {platformSettings.marketplace.minTaskBudget.toLocaleString()}–{platformSettings.marketplace.maxTaskBudget.toLocaleString()} {form.currency}.
              </p>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">City</label>
            <input
              className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
              placeholder="Lahore, Karachi, Remote..."
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Active until</label>
            <p className="text-xs text-ink/50 mb-2">
              Your task closes itself automatically once this date passes.
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {[
                { label: "1 day", hours: 24 },
                { label: "3 days", hours: 72 },
                { label: "7 days", hours: 168 },
                { label: "30 days", hours: 720 },
              ].filter((opt) => opt.hours >= platformSettings.marketplace.minTaskLifetimeHours && opt.hours <= platformSettings.marketplace.maxTaskLifetimeDays * 24).map((opt) => (
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
              className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
              value={form.expiresAt}
              min={quickPick(platformSettings.marketplace.minTaskLifetimeHours / 24)}
              max={quickPick(platformSettings.marketplace.maxTaskLifetimeDays * 24)}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
              required
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="sheen w-full rounded-full bg-green-900 px-6 py-3.5 text-sm font-semibold text-cream shadow-[0_16px_34px_-22px_rgba(11,32,22,0.9)] ring-1 ring-inset ring-white/10 transition-all hover:-translate-y-0.5 hover:bg-green-800 disabled:translate-y-0 disabled:opacity-50"
          >
            {loading ? "Posting..." : "Post Task"}
          </button>
        </form>
          </div>
        </div>
      </main>
    </>
  );
}
