"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

type Row = {
  id: string;
  userId: string;
  userName: string | null;
  userPhone: string | null;
  amount: number;
  currency: string;
  method: string;
  accountTitle: string;
  accountNumber: string;
  bankName: string | null;
  status: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
  processedAt: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  jazzcash: "JazzCash",
  easypaisa: "Easypaisa",
  bank: "Bank",
  other: "Other",
};

export default function AdminPayoutsPage() {
  const { user, loading: userLoading } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [credit, setCredit] = useState({ identifier: "", amount: "", reason: "" });
  const [creditBusy, setCreditBusy] = useState(false);

  async function giveCredit(e: React.FormEvent) {
    e.preventDefault();
    setCreditBusy(true);
    setMsg("");
    const res = await fetch("/api/admin/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: credit.identifier,
        amount: Number(credit.amount),
        reason: credit.reason,
      }),
    });
    const data = await res.json();
    setCreditBusy(false);
    if (res.ok) {
      setMsg(`Credited PKR ${Number(data.amount).toLocaleString()} to that account.`);
      setCredit({ identifier: "", amount: "", reason: "" });
      load();
    } else {
      setMsg(data.error || "Could not create the credit");
    }
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/payouts", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setRows(data.payouts || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user?.role === "admin") load();
    else if (!userLoading) setLoading(false);
  }, [user, userLoading, load]);

  async function settle(id: string, status: "processing" | "paid" | "rejected") {
    setBusy(id);
    setMsg("");
    const res = await fetch(`/api/admin/payouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reference: refs[id] || undefined }),
    });
    const data = await res.json();
    setBusy(null);
    setMsg(res.ok ? `Marked ${status}.` : data.error || "Could not update");
    load();
  }

  const pendingTotal = rows
    .filter((r) => r.status === "requested" || r.status === "processing")
    .reduce((s, r) => s + r.amount, 0);

  return (
    <>
      <Navbar />
      <main className="flex-1">
      <section className="aurora grain relative isolate overflow-hidden border-b border-line">
        <div className="relative mx-auto w-full max-w-5xl px-5 pb-8 pt-11 sm:px-6 sm:pb-10 sm:pt-14">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
                Finance · payouts
              </p>
              <h1 className="mt-4 font-display text-[2rem] font-medium leading-[1.04] tracking-[-0.02em] text-heading sm:text-[2.8rem]">
                Pay people <span className="gold-text">properly</span>.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
                Send the money from the KaamKaro account, record the reference here, and the
                provider is notified automatically.
              </p>
            </div>
            <div className="card-lux rounded-2xl px-5 py-4 text-right">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                Awaiting settlement
              </p>
              <p className="tnum mt-1 font-display text-[1.8rem] leading-none text-heading">
                PKR {pendingTotal.toLocaleString()}
              </p>
              <p className="mt-1 text-[11.5px] text-ink/45">
                {rows.filter((r) => r.status === "requested" || r.status === "processing").length} request(s) open
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
        {msg && (
          <p className="mb-5 rounded-xl border border-green-700/25 bg-green-700/5 px-4 py-2.5 text-sm text-green-800 dark:text-green-300">
            {msg}
          </p>
        )}

        {user?.role === "admin" && (
          <form
            onSubmit={giveCredit}
            className="card-lux mb-6 grid gap-3 rounded-2xl p-5 sm:grid-cols-[1.4fr_0.6fr_1.6fr_auto]"
          >
            <div className="sm:col-span-4">
              <p className="font-semibold text-heading">Add a credit</p>
              <p className="text-xs text-ink/50">
                Refund, goodwill or a test credit — it lands in that person&apos;s withdrawable
                balance with your name and a reason attached.
              </p>
            </div>
            <input
              required
              value={credit.identifier}
              onChange={(e) => setCredit({ ...credit, identifier: e.target.value })}
              placeholder="Phone or email"
              aria-label="Phone or email"
              className="min-w-0 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
            />
            <input
              required
              type="number"
              min="1"
              step="0.01"
              value={credit.amount}
              onChange={(e) => setCredit({ ...credit, amount: e.target.value })}
              placeholder="PKR"
              aria-label="Amount in PKR"
              className="min-w-0 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
            />
            <input
              required
              value={credit.reason}
              onChange={(e) => setCredit({ ...credit, reason: e.target.value })}
              placeholder="Reason (e.g. goodwill for late delivery)"
              aria-label="Reason"
              className="min-w-0 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
            />
            <button
              type="submit"
              disabled={creditBusy}
              className="sheen rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
            >
              {creditBusy ? "Saving…" : "Credit"}
            </button>
          </form>
        )}

        {userLoading || loading ? (
          <p className="text-ink/50">Loading…</p>
        ) : user?.role !== "admin" ? (
          <div className="card-lux rounded-2xl p-6">
            <p className="font-display text-lg text-heading">Admins only</p>
            <p className="mt-1 text-sm text-ink/60">
              Sign in with an admin account to settle payouts.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm text-green-800 underline">
              Back to dashboard
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line/90 bg-card/50 px-6 py-12 text-center">
            <p className="text-sm text-ink/55">
              No payout requests yet. When a provider asks to withdraw, it lands here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="card-lux rounded-xl p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-heading">
                      {r.currency} {r.amount.toLocaleString()}{" "}
                      <span className="font-normal text-ink/50">
                        · {METHOD_LABELS[r.method] || r.method}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-ink/70">
                      {r.accountTitle} — <span className="font-mono">{r.accountNumber}</span>
                      {r.bankName ? ` (${r.bankName})` : ""}
                    </p>
                    <p className="mt-1 text-xs text-ink/45">
                      {r.userName || r.userId.slice(0, 8)}
                      {r.userPhone ? ` · ${r.userPhone}` : ""} ·{" "}
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                    {r.reference && (
                      <p className="mt-1 text-xs text-ink/45">ref {r.reference}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] ${
                      r.status === "paid"
                        ? "bg-green-700/10 text-green-700 dark:text-green-300"
                        : r.status === "rejected"
                          ? "bg-red-500/10 text-red-600 dark:text-red-300"
                          : "bg-gold-500/15 text-gold-600 dark:text-gold-300"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                {r.status !== "paid" && r.status !== "rejected" && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <input
                      value={refs[r.id] || ""}
                      onChange={(e) => setRefs({ ...refs, [r.id]: e.target.value })}
                      placeholder="Transaction / TID reference"
                      className="min-w-[200px] flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
                    />
                    <button
                      onClick={() => settle(r.id, "processing")}
                      disabled={busy === r.id}
                      className="rounded-full border border-line px-4 py-2 text-sm text-ink/70 hover:border-green-700 disabled:opacity-50"
                    >
                      Processing
                    </button>
                    <button
                      onClick={() => settle(r.id, "paid")}
                      disabled={busy === r.id}
                      className="rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-cream hover:bg-green-800 disabled:opacity-50"
                    >
                      {busy === r.id ? "Saving…" : "Mark paid"}
                    </button>
                    <button
                      onClick={() => settle(r.id, "rejected")}
                      disabled={busy === r.id}
                      className="rounded-full px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </main>
    </>
  );
}
