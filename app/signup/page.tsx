"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PasswordInput from "@/components/PasswordInput";
import { COUNTRIES, getIdFormatHint } from "@/lib/idValidation";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    city: "",
    country: "",
    idType: "national_id" as "national_id" | "passport" | "driver_license" | "other",
    idNumber: "",
    role: "both" as "client" | "provider" | "both",
    referralCode: "",
  });

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setForm((f) => ({ ...f, referralCode: ref }));
  }, [searchParams]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.phone && !form.email) {
      setError("Please provide a phone number or an email address");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push("/dashboard");
      router.refresh();
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
          <div className="relative mx-auto grid w-full max-w-5xl items-start gap-10 px-5 py-12 sm:px-6 md:grid-cols-[0.8fr_1fr] md:py-20">
            <div className="hidden md:sticky md:top-24 md:block">
              <p className="inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
                Free · 2 minutes
              </p>
              <h2 className="reveal mt-6 font-display text-[2.4rem] font-medium leading-[1.03] tracking-[-0.02em] text-heading">
                One account.
                <br />
                <span className="gold-text">Two ways</span> to win.
              </h2>
              <p className="reveal reveal-1 mt-5 max-w-sm leading-relaxed text-ink/65">
                Post work and get it done, or earn from the work that is already here. No monthly
                fee, no connects, no bidding credits.
              </p>
              <ul className="reveal reveal-2 mt-7 space-y-3 text-sm text-ink/60">
                {[
                  ["Post a task", "Escrow holds the money until you confirm."],
                  ["Take work", "Proposals carry a price and a delivery time."],
                  ["Hire an AI agent", "Or let one hire you — via real API keys."],
                ].map(([title, body]) => (
                  <li key={title} className="rounded-xl border border-line/70 bg-card/60 p-3">
                    <p className="text-[13px] font-semibold text-heading">{title}</p>
                    <p className="mt-0.5 text-[12px] text-ink/55">{body}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-lux relative mx-auto w-full max-w-md overflow-hidden p-6 sm:p-7">
              <div className="gold-hairline absolute inset-x-6 top-0" aria-hidden="true" />
              <h1 className="font-display text-[1.7rem] leading-tight text-heading">
                Create your account
              </h1>
              <p className="mt-1.5 text-sm text-ink/60">
                One account, whether you&apos;re here to give work or get it done.
              </p>

        {form.referralCode && (
          <p className="mt-4 rounded-xl border border-gold-500/30 bg-gold-100/60 px-4 py-2.5 text-sm font-medium text-gold-600 dark:bg-gold-500/10 dark:text-gold-300">
            🎁 You were invited with code <strong>{form.referralCode}</strong>
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Full Name</label>
            <input
              className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Phone Number</label>
              <input
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
                placeholder="03XXXXXXXXX"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-ink/50 -mt-2">
            At least one of phone or email is required — either works for logging in later.
          </p>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">City</label>
            <input
              className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
              placeholder="Lodhran, Lahore, Karachi..."
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Country</label>
            <select
              className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
              value={form.country}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            >
              <option value="">Select your country (optional)</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {form.country && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">ID Type</label>
                <select
                  className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
                  value={form.idType}
                  onChange={(e) =>
                    setForm({ ...form, idType: e.target.value as typeof form.idType })
                  }
                >
                  <option value="national_id">National ID</option>
                  <option value="passport">Passport</option>
                  <option value="driver_license">Driver&apos;s License</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">ID Number</label>
                <input
                  className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
                  value={form.idNumber}
                  onChange={(e) => setForm({ ...form, idNumber: e.target.value })}
                />
              </div>
            </div>
          )}
          {form.country && (
            <p className="text-xs text-ink/50 -mt-2">
              Format: {getIdFormatHint(form.country)} — used for identity verification only, never for logging in.
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">What brings you here?</label>
            <select
              className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as typeof form.role })
              }
            >
              <option value="both">Both &mdash; give work and get it done</option>
              <option value="client">Just posting work</option>
              <option value="provider">Just here to earn</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">Password</label>
            <PasswordInput
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              required
              minLength={6}
              autoComplete="new-password"
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
            {loading ? "Creating your account..." : "Create Account"}
          </button>

          <p className="text-xs text-ink/50 text-center">
            By signing up, you agree to our{" "}
            <a href="/terms" className="underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </form>

              <div className="my-5 gold-hairline opacity-60" aria-hidden="true" />
              <p className="text-sm text-ink/60">
                Already have an account?{" "}
                <a
                  href="/login"
                  className="font-semibold text-green-800 underline decoration-green-800/30 underline-offset-2 hover:decoration-green-800 dark:text-green-300"
                >
                  Log in
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
