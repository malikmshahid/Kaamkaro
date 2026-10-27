"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [emailSentTo, setEmailSentTo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      if (data.delivered === "email") {
        setEmailSentTo(data.note);
      } else {
        setResetLink(`${window.location.origin}/reset-password?token=${data.resetToken}`);
      }
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
        <section className="aurora grain relative isolate overflow-hidden">
          <div className="relative mx-auto grid w-full max-w-5xl gap-10 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
            <div>
              <p className="reveal inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
                Account recovery
              </p>
              <h1 className="reveal reveal-1 mt-5 font-display text-[2rem] font-medium leading-[1.05] tracking-[-0.02em] text-heading sm:text-[2.9rem]">
                Locked out?
                <br />
                <span className="gold-text">Two taps</span>{" "}and you&apos;re back.
              </h1>
              <p className="reveal reveal-2 mt-4 max-w-md text-sm leading-relaxed text-ink/65 sm:text-[15px]">
                Enter the phone number or email on your account. We&apos;ll send a one-time reset
                link that expires shortly — nobody, including us, can use it after that.
              </p>
              <ul className="reveal reveal-3 mt-7 space-y-3 text-sm text-ink/65">
                {[
                  "Works with the phone number you signed up with",
                  "Escrow and wallet balances stay untouched",
                  "Five requests an hour, so nobody can spam your inbox",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-gold-600 dark:text-gold-300">◆</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-lux reveal reveal-2 relative overflow-hidden rounded-2xl p-6 shadow-lux sm:p-8">
              <div className="gold-hairline absolute inset-x-6 top-0 opacity-80" aria-hidden="true" />
              {emailSentTo ? (
                <div>
                  <p className="font-display text-xl text-heading">Check your inbox</p>
                  <p className="mt-2 text-sm text-ink/60">{emailSentTo}</p>
                  <p className="mt-4 rounded-xl border border-line bg-paper/60 px-4 py-3 text-xs text-ink/55">
                    The link is valid for a short window. If it doesn&apos;t arrive in a couple of
                    minutes, check spam, then try again.
                  </p>
                  <Link
                    href="/login"
                    className="mt-6 block rounded-xl border border-line bg-card py-3 text-center text-sm font-semibold text-heading"
                  >
                    Back to log in
                  </Link>
                </div>
              ) : resetLink ? (
                <div className="space-y-4">
                  <p className="font-display text-xl text-heading">Your reset link</p>
                  <p className="text-xs text-ink/55">
                    Email/SMS delivery isn&apos;t switched on for this environment yet, so the link
                    is shown here instead of being sent. It works once.
                  </p>
                  <a
                    href={resetLink}
                    className="block break-all rounded-xl border border-line bg-paper/60 px-4 py-3 text-[12.5px] text-green-700 underline dark:text-green-300"
                  >
                    {resetLink}
                  </a>
                  <button
                    onClick={() => router.push(resetLink.replace(window.location.origin, ""))}
                    className="sheen w-full rounded-xl bg-green-700 py-3 text-sm font-semibold text-cream shadow-lux-sm"
                  >
                    Continue to reset password
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="identifier"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-ink/55"
                    >
                      Phone number or email
                    </label>
                    <input
                      id="identifier"
                      className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm outline-none transition focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
                      placeholder="03XXXXXXXXX or you@example.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoComplete="username"
                      required
                    />
                  </div>

                  {error && (
                    <p className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="sheen w-full rounded-xl bg-green-700 py-3 text-sm font-semibold text-cream shadow-lux-sm ring-1 ring-inset ring-white/15 transition disabled:opacity-50"
                  >
                    {loading ? "Sending…" : "Send reset link"}
                  </button>

                  <p className="pt-1 text-center text-xs text-ink/50">
                    Remembered it?{" "}
                    <Link href="/login" className="text-green-700 underline dark:text-green-300">
                      Log in
                    </Link>
                  </p>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
