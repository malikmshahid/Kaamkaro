"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { CURRENCIES, formatMoney } from "@/lib/currency";

const CATEGORIES = [
  { value: "delivery", label: "Delivery" },
  { value: "design", label: "Design" },
  { value: "coding", label: "Coding / IT" },
  { value: "writing", label: "Writing" },
  { value: "home", label: "Home services" },
  { value: "verification", label: "Verification / Photo" },
  { value: "other", label: "Other" },
] as const;

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm outline-none transition placeholder:text-ink/30 focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20";
const labelStyle =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50";

export default function NewToolPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "design",
    price: "",
    currency: "PKR",
    deliveryDays: "1",
    city: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          deliveryDays: Number(form.deliveryDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push(`/tools/${data.toolId}`);
    } catch {
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  const priceNumber = Number(form.price);
  const showEarnings = Number.isFinite(priceNumber) && priceNumber > 0;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-5xl px-5 pb-8 pt-11 sm:px-6 sm:pb-10 sm:pt-14">
            <p className="reveal inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
              The Toolbox · list a service
            </p>
            <h1 className="reveal reveal-1 mt-5 max-w-3xl font-display text-[2.05rem] font-medium leading-[1.03] tracking-[-0.02em] text-heading sm:text-[3rem]">
              Package what you&apos;re <span className="gold-text">good at</span>.
            </h1>
            <p className="reveal reveal-2 mt-4 max-w-xl text-sm leading-relaxed text-ink/65 sm:text-[15px]">
              A fixed price and a deadline up front — buyers tap once, no bidding. Escrow holds the
              money until you deliver.
            </p>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-9 sm:px-6 sm:py-11 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <form onSubmit={handleSubmit} className="card-lux rounded-2xl p-5 sm:p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className={labelStyle}>
                  Listing title
                </label>
                <input
                  id="title"
                  className={field}
                  placeholder="e.g. I'll design a logo for your business"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  maxLength={120}
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className={labelStyle}>
                  What the buyer gets
                </label>
                <textarea
                  id="description"
                  className={`${field} min-h-32 resize-y`}
                  placeholder="Exactly what is included, how many revisions, what you need from them…"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={4000}
                  required
                />
                <p className="mt-1 text-right text-[11px] text-ink/40">
                  {form.description.length}/4000
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="category" className={labelStyle}>
                    Category
                  </label>
                  <select
                    id="category"
                    className={field}
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="price" className={labelStyle}>
                    Price
                  </label>
                  <div className="flex gap-2">
                    <select
                      aria-label="Currency"
                      className="rounded-xl border border-line bg-card px-2.5 py-3 text-sm shadow-lux-sm outline-none focus:border-gold-500/60"
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
                      id="price"
                      type="number"
                      min="1"
                      inputMode="numeric"
                      className={`${field} tnum`}
                      placeholder="2500"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="delivery" className={labelStyle}>
                    Delivery time (days)
                  </label>
                  <input
                    id="delivery"
                    type="number"
                    min="1"
                    inputMode="numeric"
                    className={`${field} tnum`}
                    value={form.deliveryDays}
                    onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="city" className={labelStyle}>
                    City <span className="normal-case tracking-normal text-ink/35">(optional)</span>
                  </label>
                  <input
                    id="city"
                    className={field}
                    placeholder="Leave blank if fully remote"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-300/60 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="sheen mt-5 w-full rounded-xl bg-gold-500 px-6 py-3.5 text-sm font-semibold text-cream shadow-[0_16px_34px_-22px_rgba(169,119,44,0.95)] ring-1 ring-inset ring-white/20 transition disabled:opacity-50"
            >
              {loading ? "Listing…" : "Publish listing"}
            </button>
            <p className="mt-3 text-center text-[11.5px] text-ink/45">
              You can pause or edit the listing any time from your dashboard.
            </p>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="card-lux relative overflow-hidden rounded-2xl p-5">
              <div className="gold-hairline absolute inset-x-5 top-0 opacity-70" aria-hidden="true" />
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                You receive
              </p>
              {showEarnings ? (
                <>
                  <p className="tnum mt-1 font-display text-[1.9rem] leading-none text-heading">
                    {formatMoney(priceNumber * 0.9, form.currency)}
                  </p>
                  <p className="mt-2 text-[12px] text-ink/50">
                    After the 10% platform fee. Buyers pay the listed price; nothing is hidden from
                    them.
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[13px] leading-relaxed text-ink/50">
                  Enter a price on the left and your take-home appears here — the platform keeps
                  10%, escrow handles the rest.
                </p>
              )}
            </div>

            <div className="card-lux rounded-2xl p-5">
              <p className="font-display text-[15px] text-heading">What makes a listing sell</p>
              <ul className="mt-3 space-y-2.5 text-[13px] text-ink/65">
                {[
                  "A specific promise beats a broad skill — “one logo, 3 concepts” not “design work”.",
                  "State the number of revisions. It is the #1 source of disputes.",
                  "Price near the median in your city; the meter on the form tells you where you are.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2">
                    <span className="mt-0.5 text-gold-600 dark:text-gold-300">◆</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="px-1 text-[12px] text-ink/45">
              Prefer to bid on open work instead?{" "}
              <Link href="/tasks" className="font-semibold text-green-700 underline dark:text-green-300">
                Browse tasks
              </Link>
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
