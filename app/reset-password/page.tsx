"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PasswordInput from "@/components/PasswordInput";

function strengthOf(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (!pw) return { score: 0, label: "", tone: "" };
  if (score <= 2) return { score, label: "Weak", tone: "bg-red-500" };
  if (score === 3) return { score, label: "Okay", tone: "bg-gold-500" };
  if (score === 4) return { score, label: "Strong", tone: "bg-green-600" };
  return { score, label: "Excellent", tone: "bg-green-700" };
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = strengthOf(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-dashed border-line/90 bg-card/50 px-6 py-8 text-center">
        <p className="font-display text-lg text-heading">This link is incomplete</p>
        <p className="mt-2 text-sm text-ink/55">
          Request a fresh one from the{" "}
          <Link href="/forgot-password" className="text-green-700 underline dark:text-green-300">
            forgot password
          </Link>{" "}
          page.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-green-700/30 bg-green-700/5 px-6 py-8 text-center">
        <p className="font-display text-xl text-heading">Password updated</p>
        <p className="mt-2 text-sm text-ink/60">Taking you to the login page…</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="new-password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-ink/55"
        >
          New password
        </label>
        <PasswordInput
          id="new-password"
          value={password}
          onChange={setPassword}
          minLength={8}
          required
          autoComplete="new-password"
        />
        {password && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line/70">
              <div
                className={`h-full rounded-full transition-all ${strength.tone}`}
                style={{ width: `${Math.min(100, (strength.score / 5) * 100)}%` }}
              />
            </div>
            <span className="w-20 shrink-0 text-right text-[11px] font-semibold text-ink/55">
              {strength.label}
            </span>
          </div>
        )}
      </div>
      <div>
        <label
          htmlFor="confirm-password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-ink/55"
        >
          Confirm new password
        </label>
        <PasswordInput
          id="confirm-password"
          value={confirm}
          onChange={setConfirm}
          minLength={8}
          required
          autoComplete="new-password"
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
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
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
                Set a <span className="gold-text">new password</span>.
              </h1>
              <p className="reveal reveal-2 mt-4 max-w-md text-sm leading-relaxed text-ink/65 sm:text-[15px]">
                Pick something you&apos;ll actually remember this time — at least 8 characters. A
                passphrase of three unrelated words beats a clever short one.
              </p>
              <ul className="reveal reveal-3 mt-7 space-y-3 text-sm text-ink/65">
                {[
                  "Never reused from another site",
                  "At least 8 characters — longer is stronger",
                  "Every other session stays logged in; change that in Settings",
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
              <Suspense fallback={<p className="text-sm text-ink/50">Loading…</p>}>
                <ResetPasswordForm />
              </Suspense>
              <p className="mt-5 text-center text-xs text-ink/50">
                <Link href="/login" className="text-green-700 underline dark:text-green-300">
                  Back to log in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
