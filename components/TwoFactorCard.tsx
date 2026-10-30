"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/lib/useUser";

type Status = { enabled: boolean; enabledAt: string | null; backupCodesLeft: number };
type Setup = { secret: string; otpauth: string; qr: string; account: string };

const field =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm shadow-lux-sm outline-none transition placeholder:text-ink/30 focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20";

/**
 * Two-factor (TOTP) card for /settings.
 *
 * Three states, in order: off → enrolling (QR + secret + confirm code) →
 * on (recovery codes left, turn off behind password + code).
 */
export default function TwoFactorCard() {
  const { user, loading: userLoading } = useUser();
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadStatus() {
    const res = await fetch("/api/auth/2fa/status");
    if (!res.ok) return;
    setStatus(await res.json());
  }

  // Wait for the session before asking: a guest hitting /settings during the
  // loading frame used to fire a status request that always 401s (red console
  // error for a state we handle anyway).
  useEffect(() => {
    if (userLoading || !user) return;
    loadStatus();
  }, [user, userLoading]);

  async function startSetup() {
    setBusy(true);
    setError("");
    setBackupCodes(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start setup");
        return;
      }
      setSetup(data);
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not turn on two-factor");
        return;
      }
      setBackupCodes(data.backupCodes || []);
      setSetup(null);
      setCode("");
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not turn off two-factor");
        return;
      }
      setShowDisable(false);
      setPassword("");
      setCode("");
      await loadStatus();
    } finally {
      setBusy(false);
    }
  }

  const enabled = status?.enabled ?? false;

  return (
    <section className="card-lux relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="gold-hairline absolute inset-x-5 top-0 opacity-70" aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-lg text-heading">Two-factor authentication</h2>
          <p className="mt-1 max-w-md text-[13px] leading-relaxed text-ink/60">
            A 6-digit code from your authenticator app on top of your password. Even if someone
            gets your password, they still can&apos;t get in.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] ${
            enabled
              ? "bg-green-700/10 text-green-700 dark:text-green-300"
              : "bg-ink/8 text-ink/55"
          }`}
        >
          {status === null ? "…" : enabled ? "On" : "Off"}
        </span>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-300/60 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          {error}
        </p>
      )}

      {/* Recovery codes are shown exactly once, right after enabling. */}
      {backupCodes && (
        <div className="mt-4 rounded-xl border border-gold-500/50 bg-gold-100/40 p-4 dark:bg-gold-500/10">
          <p className="font-display text-[15px] text-heading">
            Save these recovery codes now
          </p>
          <p className="mt-1 text-[12px] text-ink/60">
            Each one works once, if you lose your phone. We keep only hashes — this is the only
            time you&apos;ll see them.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-[12.5px] text-ink/80 sm:grid-cols-5">
            {backupCodes.map((c) => (
              <span key={c} className="rounded bg-card px-2 py-1 text-center">
                {c}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(backupCodes.join("\n"));
                setCopied(true);
              }}
              className="rounded-full bg-green-700 px-4 py-2 text-xs font-semibold text-cream"
            >
              {copied ? "Copied ✓" : "Copy all"}
            </button>
            <button
              onClick={() => setBackupCodes(null)}
              className="text-xs font-semibold text-ink/50 underline"
            >
              I&apos;ve saved them
            </button>
          </div>
        </div>
      )}

      {/* OFF → start enrollment */}
      {!enabled && !setup && (
        <button
          onClick={startSetup}
          disabled={busy}
          className="sheen mt-4 rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
        >
          {busy ? "Preparing…" : "Turn on two-factor"}
        </button>
      )}

      {/* ENROLLING → QR + secret + confirm */}
      {!enabled && setup && (
        <form onSubmit={confirmEnable} className="mt-4 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qr}
              alt="QR code for your authenticator app"
              width={148}
              height={148}
              className="shrink-0 rounded-xl border border-line bg-white p-1.5"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-heading">1. Scan this in your app</p>
              <p className="mt-0.5 text-[12px] text-ink/55">
                Google Authenticator, Authy, 1Password, Microsoft Authenticator — anything that
                speaks TOTP.
              </p>
              <p className="mt-3 text-[13px] font-semibold text-heading">No camera?</p>
              <code className="mt-1 block break-all rounded-lg border border-line bg-paper px-3 py-2 font-mono text-[12px] text-ink/75">
                {setup.secret}
              </code>
              <p className="mt-1 text-[11px] text-ink/40">Account: {setup.account}</p>
            </div>
          </div>

          <div>
            <label htmlFor="enable-code" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink/50">
              2. Enter the code it shows
            </label>
            <input
              id="enable-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className={`${field} tnum max-w-[200px] text-center font-display text-[1.2rem] tracking-[0.3em]`}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              required
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="sheen rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
            >
              {busy ? "Checking…" : "Turn on"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSetup(null);
                setCode("");
                setError("");
              }}
              className="text-xs font-semibold text-ink/50 underline"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ON → status + disable */}
      {enabled && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 text-[12px]">
            <span className="rounded-full border border-line bg-card/80 px-3 py-1.5 font-medium text-ink/70">
              On since{" "}
              {status?.enabledAt ? new Date(status.enabledAt).toLocaleDateString() : "today"}
            </span>
            <span className="rounded-full border border-line bg-card/80 px-3 py-1.5 font-medium text-ink/70">
              {status?.backupCodesLeft ?? 0} recovery code
              {(status?.backupCodesLeft ?? 0) === 1 ? "" : "s"} left
            </span>
          </div>

          {(status?.backupCodesLeft ?? 0) <= 2 && (
            <p className="rounded-xl border border-gold-500/40 bg-gold-100/40 px-4 py-2.5 text-[12.5px] text-gold-600 dark:bg-gold-500/10 dark:text-gold-300">
              You&apos;re running low on recovery codes. Turn two-factor off and on again to get a
              fresh set.
            </p>
          )}

          {!showDisable ? (
            <button
              onClick={() => setShowDisable(true)}
              className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink/60 hover:border-red-400 hover:text-red-600"
            >
              Turn off two-factor
            </button>
          ) : (
            <form onSubmit={confirmDisable} className="space-y-3 rounded-xl border border-line bg-paper/60 p-4">
              <p className="text-[12.5px] text-ink/65">
                Password plus a live code — turning this off is exactly what an attacker would try
                first. Every other session will be logged out.
              </p>
              <input
                type="password"
                autoComplete="current-password"
                className={field}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                className={`${field} tnum max-w-[200px] text-center tracking-[0.3em]`}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                required
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-cream disabled:opacity-50"
                >
                  {busy ? "Checking…" : "Turn off"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDisable(false);
                    setPassword("");
                    setCode("");
                    setError("");
                  }}
                  className="text-xs font-semibold text-ink/50 underline"
                >
                  Keep it on
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
