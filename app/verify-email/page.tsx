"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

const OTP_LENGTH = 6;

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  async function submit(code: string) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, otp: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not verify code");
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

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== OTP_LENGTH) {
      setError(`Enter all ${OTP_LENGTH} digits`);
      return;
    }
    await submit(otp);
  }

  function handleChange(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, OTP_LENGTH);
    setOtp(digits);
    setError("");
    // Paste or autofill of the full code submits on its own — nobody wants to
    // type six digits and then hunt for a button.
    if (digits.length === OTP_LENGTH) void submit(digits);
  }

  async function handleResend() {
    setResending(true);
    setResendMessage("");
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not resend code");
        return;
      }
      setResendMessage("A new code is on its way. It expires in 15 minutes.");
      setOtp("");
    } catch {
      setError("Could not connect to the server");
    } finally {
      setResending(false);
    }
  }

  if (!userId) {
    return (
      <div className="card-lux rounded-2xl p-7 text-center">
        <p className="font-display text-xl text-heading">This link is incomplete</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink/60">
          The verification code is tied to the account you just created. Start again from signup
          and we&apos;ll send a fresh one.
        </p>
        <Link
          href="/signup"
          className="sheen mt-6 inline-block rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream"
        >
          Create an account
        </Link>
      </div>
    );
  }

  return (
    <div className="card-lux relative overflow-hidden rounded-2xl p-6 sm:p-7">
      <div className="gold-hairline absolute inset-x-6 top-0" aria-hidden="true" />
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-600 dark:text-gold-300">
        One last step
      </p>
      <h1 className="mt-2 font-display text-[1.7rem] leading-tight text-heading">
        Enter the {OTP_LENGTH}-digit code
      </h1>
      <p className="mt-1.5 text-sm text-ink/60">
        We sent it to the email on your account. It expires shortly, so enter it now.
      </p>

      <form onSubmit={handleVerify} className="mt-6 space-y-4">
        <div>
          <label htmlFor="otp" className="sr-only">
            Verification code
          </label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            className="tnum w-full rounded-xl border border-line bg-card px-4 py-4 text-center font-display text-[1.6rem] tracking-[0.5em] shadow-lux-sm outline-none transition focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
            placeholder="——————"
            value={otp}
            onChange={(e) => handleChange(e.target.value)}
            maxLength={OTP_LENGTH}
            disabled={loading}
            required
          />
          <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition-colors ${
                  i < otp.length ? "bg-green-700 dark:bg-gold-400" : "bg-line"
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-300/60 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </p>
        )}
        {resendMessage && (
          <p className="rounded-xl border border-green-700/25 bg-green-700/5 px-4 py-2.5 text-sm text-green-800 dark:text-green-300">
            {resendMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || otp.length !== OTP_LENGTH}
          className="sheen w-full rounded-xl bg-green-700 py-3 text-sm font-semibold text-cream shadow-lux-sm ring-1 ring-inset ring-white/15 transition disabled:opacity-50"
        >
          {loading ? "Verifying…" : "Verify & continue"}
        </button>
      </form>

      <div className="mt-5 flex items-center justify-between gap-3 text-xs">
        <button
          onClick={handleResend}
          disabled={resending}
          className="font-semibold text-green-700 underline disabled:opacity-50 dark:text-green-300"
        >
          {resending ? "Sending…" : "Resend code"}
        </button>
        <Link href="/login" className="text-ink/50 hover:text-ink">
          Use a different account
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden">
          <div className="relative mx-auto grid w-full max-w-5xl gap-10 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
            <div>
              <p className="reveal inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
                Email verification
              </p>
              <h2 className="reveal reveal-1 mt-5 font-display text-[2rem] font-medium leading-[1.05] tracking-[-0.02em] text-heading sm:text-[2.7rem]">
                Prove it&apos;s <span className="gold-text">you</span>,
                <br />
                then get to work.
              </h2>
              <p className="reveal reveal-2 mt-4 max-w-md text-sm leading-relaxed text-ink/65 sm:text-[15px]">
                A verified email is how we reach you about escrow, disputes and payouts — and how
                nobody else can claim your account.
              </p>
              <ul className="reveal reveal-3 mt-7 space-y-3 text-sm text-ink/65">
                {[
                  "Six digits, one use, short expiry",
                  "Fifteen attempts an hour — guessing is pointless",
                  "You can change the email later from Settings",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-gold-600 dark:text-gold-300">◆</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="reveal reveal-2">
              <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl border border-line bg-card/60" />}>
                <VerifyEmailForm />
              </Suspense>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
