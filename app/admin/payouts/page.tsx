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
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-14 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">
              Finance
            </p>
            <h1 className="mt-2 font-display text-3xl text-heading">Payout queue</h1>
            <p className="mt-2 text-sm text-ink/60">
              Send the money from the KaamKaro account, then record the reference here. The
              provider is notified automatically.
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-2xl text-heading">PKR {pendingTotal.toLocaleString()}</p>
            <p className="text-xs uppercase tracking-[0.12em] text-ink/40">awaiting settlement</p>
          </div>
        </div>

        {msg && (
          <p className="mb-5 rounded-lg bg-green-950/5 px-4 py-2 text-sm text-green-800 dark:bg-green-500/10 dark:text-green-300">
            {msg}
          </p>
        )}

        {userLoading || loading ? (
          <p className="text-ink/50">Loading…</p>
        ) : user?.role !== "admin" ? (
          <div className="rounded-2xl border border-line bg-card p-6">
            <p className="font-semibold text-heading">Admins only</p>
            <p className="mt-1 text-sm text-ink/60">
              Sign in with an admin account to settle payouts.
            </p>
            <Link href="/dashboard" className="mt-4 inline-block text-sm text-green-800 underline">
              Back to dashboard
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <p className="text-ink/50">No payout requests yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="rounded-xl border border-line bg-card p-5">
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
                  <span className="rounded-full bg-paper px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink/60">
                    {r.status}
                  </span>
                </div>

                {r.status !== "paid" && r.status !== "rejected" && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                    <input
                      value={refs[r.id] || ""}
                      onChange={(e) => setRefs({ ...refs, [r.id]: e.target.value })}
                      placeholder="Transaction / TID reference"
                      className="min-w-[220px] flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-700"
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
                      className="rounded-full bg-green-900 px-4 py-2 text-sm text-cream hover:bg-green-800 disabled:opacity-50"
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
      </main>
    </>
  );
}
