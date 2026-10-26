"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Provider earnings + withdrawal.
 *
 * "Available" is money already released from escrow that hasn't been paid out
 * yet. Requests go into a queue an admin settles by hand (JazzCash / Easypaisa
 * / bank), and every step is visible to the provider here — no support ticket
 * needed to find out where the money is.
 */

type Payout = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  status: "requested" | "processing" | "paid" | "rejected";
  reference: string | null;
  note: string | null;
  createdAt: string;
};

type Balance = { amount: number; currency: string };

const METHOD_LABELS: Record<string, string> = {
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank: "Bank transfer",
  other: "Other",
};

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-gold-100 text-gold-500",
  processing: "bg-gold-100 text-gold-500",
  paid: "bg-green-950/5 text-green-800",
  rejected: "bg-red-50 text-red-700",
};

export default function PayoutPanel() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<Balance>({ amount: 0, currency: "PKR" });
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    method: "jazzcash",
    accountTitle: "",
    accountNumber: "",
    bankName: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/payouts", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setBalance(data.available || { amount: 0, currency: "PKR" });
      setPayouts(data.payouts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Could not request the payout");
    setMsg(
      `Requested ${balance.currency} ${Number(data.amount).toLocaleString()} — we'll settle it within 2 working days.`
    );
    setOpen(false);
    load();
  }

  const pendingRequest = payouts.find((p) => p.status === "requested" || p.status === "processing");

  return (
    <section className="mt-10 rounded-2xl border border-line bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl text-heading">Earnings &amp; payouts</h2>
          <p className="mt-1 text-sm text-ink/60">
            Money released from escrow that hasn&apos;t been withdrawn yet.
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl text-heading">
            {loading ? "…" : `${balance.currency} ${balance.amount.toLocaleString()}`}
          </p>
          <p className="text-xs uppercase tracking-[0.12em] text-ink/40">available</p>
        </div>
      </div>

      {msg && (
        <p className="mt-4 rounded-lg bg-green-950/5 px-4 py-2 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300">
          {msg}
        </p>
      )}
      {err && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{err}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!open && !pendingRequest && (
          <button
            onClick={() => setOpen(true)}
            disabled={balance.amount <= 0}
            className="rounded-full bg-green-900 px-5 py-2.5 text-sm text-cream transition-colors hover:bg-green-800 disabled:opacity-40"
          >
            Withdraw {balance.amount > 0 ? `${balance.currency} ${balance.amount.toLocaleString()}` : ""}
          </button>
        )}
        {pendingRequest && (
          <p className="text-sm text-ink/60">
            {pendingRequest.currency} {pendingRequest.amount.toLocaleString()} —{" "}
            {pendingRequest.status === "processing" ? "being processed" : "waiting for approval"}
          </p>
        )}
        {balance.amount <= 0 && !pendingRequest && (
          <p className="text-sm text-ink/50">
            Nothing to withdraw yet — get paid on a task first.
          </p>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="mt-5 grid gap-3 rounded-xl border border-line bg-paper/60 p-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-ink/70">Send to</span>
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="w-full rounded-lg border border-line bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
            >
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">Easypaisa</option>
              <option value="bank">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink/70">Account holder name</span>
            <input
              required
              value={form.accountTitle}
              onChange={(e) => setForm({ ...form, accountTitle: e.target.value })}
              placeholder="As registered with the wallet/bank"
              className="w-full rounded-lg border border-line bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-ink/70">
              {form.method === "bank" ? "Account / IBAN" : "Wallet number"}
            </span>
            <input
              required
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder={form.method === "bank" ? "PK00XXXX0000000000000000" : "03XXXXXXXXX"}
              className="w-full rounded-lg border border-line bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
            />
          </label>
          {form.method === "bank" && (
            <label className="block text-sm">
              <span className="mb-1 block text-ink/70">Bank name</span>
              <input
                value={form.bankName}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                placeholder="Meezan / HBL / UBL …"
                className="w-full rounded-lg border border-line bg-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-700"
              />
            </label>
          )}
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-full bg-green-900 px-5 py-2.5 text-sm text-cream hover:bg-green-800 disabled:opacity-50"
            >
              {busy ? "Sending…" : "Request payout"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-line px-4 py-2.5 text-sm text-ink/60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {payouts.length > 0 && (
        <ul className="mt-6 divide-y divide-line border-t border-line">
          {payouts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
              <span>
                <span className="font-medium text-heading">
                  {p.currency} {p.amount.toLocaleString()}
                </span>{" "}
                <span className="text-ink/50">· {METHOD_LABELS[p.method] || p.method}</span>
                {p.reference && <span className="text-ink/40"> · ref {p.reference}</span>}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-xs text-ink/40">
                  {new Date(p.createdAt).toLocaleDateString()}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${
                    STATUS_STYLE[p.status]
                  }`}
                >
                  {p.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
