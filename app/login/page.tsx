"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");

  function finishLogin() {
    // Honour ?next=/messages style redirects, but only for same-site paths
    // (never an absolute URL — that would be an open redirect).
    const nextParam = new URLSearchParams(window.location.search).get("next") || "";
    const safeNext = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "";
    router.push(safeNext || "/dashboard");
    router.refresh();
  }

  async function handleTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not verify that code");
        return;
      }
      if (data.usedBackupCode) {
        setNotice(`Recovery code used — ${data.backupCodesLeft} left.`);
      }
      finishLogin();
    } catch {
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not log in");
        return;
      }
      // Password accepted, but this account has a second factor: no session
      // exists yet. Swap the form for the code step.
      if (data.twoFactor) {
        setChallenge(data.challenge);
        return;
      }
      finishLogin();
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
          <div className="relative mx-auto grid w-full max-w-5xl items-center gap-10 px-5 py-12 sm:px-6 md:grid-cols-[1fr_0.85fr] md:py-20">
            {/* left: the promise */}
            <div className="hidden md:block">
              <p className="inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
                Welcome back
              </p>
              <h2 className="reveal mt-6 font-display text-[2.4rem] font-medium leading-[1.03] tracking-[-0.02em] text-heading">
                Your work,
                <br />
                <span className="gold-text">still waiting.</span>
              </h2>
              <p className="reveal reveal-1 mt-5 max-w-sm leading-relaxed text-ink/65">
                Escrow is holding the money, the AI has already checked the proof, and the only
                thing missing is your confirm.
              </p>
              <ul className="reveal reveal-2 mt-7 space-y-3 text-sm text-ink/60">
                {[
                  "Every task escrow-backed from day one",
                  "AI-checked proof before you pay",
                  "PKR first, no connects, no bidding credits",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-[3px] flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full bg-green-900/8 text-green-700 dark:bg-green-500/15 dark:text-green-300">
                      <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true">
                        <path d="m3 8.5 3 3 7-7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} />
                      </svg>
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* right: the form */}
            <div className="card-lux relative mx-auto w-full max-w-md overflow-hidden p-6 sm:p-7">
              <div className="gold-hairline absolute inset-x-6 top-0" aria-hidden="true" />
              <h1 className="font-display text-[1.7rem] leading-tight text-heading">Welcome back</h1>
              <p className="mt-1.5 text-sm text-ink/60">Log in to pick up where you left off.</p>

              {challenge ? (
                <form onSubmit={handleTwoFactor} className="mt-6 space-y-4">
                  <div className="rounded-xl border border-gold-500/35 bg-gold-100/40 px-4 py-3 text-[12.5px] leading-relaxed text-ink/70 dark:bg-gold-500/10">
                    Two-factor is on for this account. Enter the current 6-digit code from your
                    authenticator app — or one of your recovery codes.
                  </div>
                  <div>
                    <label
                      htmlFor="totp"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50"
                    >
                      Authentication code
                    </label>
                    <input
                      id="totp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      className="tnum w-full rounded-xl border border-line bg-card px-4 py-3 text-center font-display text-[1.35rem] tracking-[0.35em] shadow-lux-sm outline-none transition focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
                      placeholder="000000"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      maxLength={16}
                      required
                    />
                  </div>

                  {error && (
                    <p role="alert" className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                      {error}
                    </p>
                  )}
                  {notice && (
                    <p className="rounded-xl border border-green-700/25 bg-green-700/5 px-4 py-2.5 text-sm text-green-800 dark:text-green-300">
                      {notice}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || code.trim().length < 4}
                    className="sheen w-full rounded-full bg-green-900 px-6 py-3.5 text-sm font-semibold text-cream shadow-[0_16px_34px_-22px_rgba(11,32,22,0.9)] ring-1 ring-inset ring-white/10 transition-all hover:-translate-y-0.5 hover:bg-green-800 disabled:translate-y-0 disabled:opacity-50"
                  >
                    {loading ? "Checking…" : "Verify & log in"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChallenge(null);
                      setCode("");
                      setError("");
                      setNotice("");
                    }}
                    className="w-full text-center text-xs font-semibold text-ink/50 underline"
                  >
                    Use a different account
                  </button>
                </form>
              ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="identifier" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                    Phone number or email
                  </label>
                  <input
                    id="identifier"
                    className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm transition-shadow placeholder:text-ink/30 focus:border-green-800/40 focus:outline-none focus:ring-2 focus:ring-green-700/40"
                    value={form.identifier}
                    onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label htmlFor="password" className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">
                      Password
                    </label>
                    <a
                      href="/forgot-password"
                      className="text-[11px] font-semibold text-green-800 underline decoration-green-800/30 underline-offset-2 hover:decoration-green-800 dark:text-green-300"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <PasswordInput
                    value={form.password}
                    onChange={(v) => setForm({ ...form, password: v })}
                    required
                    autoComplete="current-password"
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
                  {loading ? "Logging in…" : "Log in"}
                </button>
              </form>
              )}

              <div className="my-5 gold-hairline opacity-60" aria-hidden="true" />

              <p className="text-sm text-ink/60">
                Don&apos;t have an account?{" "}
                <a
                  href="/signup"
                  className="font-semibold text-green-800 underline decoration-green-800/30 underline-offset-2 hover:decoration-green-800 dark:text-green-300"
                >
                  Sign up free
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
