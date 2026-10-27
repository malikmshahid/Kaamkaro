"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";
import { formatMoney } from "@/lib/currency";
import Tabs, { type TabItem } from "@/components/Tabs";

type Stats = {
  userCount: number;
  taskCount: number;
  disputedCount: number;
  completedCount: number;
  gmv: number;
  escrowHeld: number;
};

type AdminUser = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: string;
  city: string | null;
  country: string | null;
  idType: string | null;
  idNumber: string | null;
  ratingAvg: number;
  ratingCount: number;
  cnicVerified: boolean;
  createdAt: string;
};

type AdminTask = {
  id: string;
  title: string;
  status: string;
  budget: number;
  currency: string;
  postedByType: string;
  city: string | null;
  createdAt: string;
};

type MediatorBrief = {
  available: boolean;
  reason?: string;
  summary: string;
  clientCase: string;
  providerCase: string;
  evidenceGaps: string[];
  recommendation: "release_provider" | "refund_client" | "need_more_info";
  confidence: number;
  rationale: string;
  fairnessNote: string;
  messageCount: number;
  model: string;
};

type Revenue = {
  commissionRatePercent: number;
  earnedByCurrency: { currency: string; total: number; count: number }[];
  pendingByCurrency: { currency: string; total: number; count: number }[];
};

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const [tab, setTab] = useState<"overview" | "disputes" | "users" | "tasks" | "revenue">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [disputes, setDisputes] = useState<AdminTask[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allTasks, setAllTasks] = useState<AdminTask[]>([]);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [newRate, setNewRate] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [briefs, setBriefs] = useState<Record<string, MediatorBrief>>({});
  const [mediating, setMediating] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [statsRes, disputesRes] = await Promise.all([
      fetch("/api/admin/stats"),
      fetch("/api/admin/tasks?status=disputed"),
    ]);
    if (statsRes.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    setStats(await statsRes.json());
    const d = await disputesRes.json();
    setDisputes(d.tasks || []);
    setLoading(false);
  }

  async function loadUsers() {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    setUsers(data.users || []);
  }

  async function loadTasks() {
    const res = await fetch("/api/admin/tasks");
    const data = await res.json();
    setAllTasks(data.tasks || []);
  }

  async function loadRevenue() {
    const res = await fetch("/api/admin/revenue");
    const data = await res.json();
    setRevenue(data);
    setNewRate(String(data.commissionRatePercent ?? ""));
  }

  async function handleMediate(taskId: string) {
    setMediating(taskId);
    try {
      const res = await fetch("/api/admin/mediation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBriefs((b) => ({
          ...b,
          [taskId]: {
            available: false,
            reason: data.error || "Mediator failed",
            summary: "",
            clientCase: "",
            providerCase: "",
            evidenceGaps: [],
            recommendation: "need_more_info",
            confidence: 0,
            rationale: "",
            fairnessNote: "",
            messageCount: 0,
            model: "none",
          },
        }));
        return;
      }
      setBriefs((b) => ({ ...b, [taskId]: data.brief as MediatorBrief }));
    } finally {
      setMediating(null);
    }
  }

  async function handleSaveRate(e: React.FormEvent) {
    e.preventDefault();
    setSavingRate(true);
    try {
      const res = await fetch("/api/admin/settings/commission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionRatePercent: Number(newRate) }),
      });
      if (res.ok) loadRevenue();
    } finally {
      setSavingRate(false);
    }
  }

  useEffect(() => {
    if (!userLoading && user) loadAll();
    if (!userLoading && !user) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  useEffect(() => {
    if (tab === "users" && users.length === 0) loadUsers();
    if (tab === "tasks" && allTasks.length === 0) loadTasks();
    if (tab === "revenue" && !revenue) loadRevenue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleResolve(taskId: string, decision: "release_provider" | "refund_client") {
    const notes = window.prompt("Reason for this decision (optional, visible to both sides):") || "";
    const res = await fetch(`/api/admin/tasks/${taskId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, notes }),
    });
    if (res.ok) loadAll();
  }

  async function handleVerify(userId: string, verified: boolean) {
    const res = await fetch(`/api/admin/users/${userId}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verified }),
    });
    if (res.ok) loadUsers();
  }

  if (!userLoading && !user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-6">
          <div className="card-lux rounded-2xl p-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-600 dark:text-gold-300">
              Admin
            </p>
            <h1 className="font-display text-2xl text-heading">Log in to open the control room</h1>
            <Link
              href="/login"
              className="sheen mt-6 inline-block rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream"
            >
              Log in
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (forbidden) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-16 sm:px-6">
          <div className="card-lux rounded-2xl p-8 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-500">
              Restricted
            </p>
            <h1 className="font-display text-2xl text-heading">This page is admin-only</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
              Admin access is a database role, not a toggle. Ask an existing admin to set
              <code className="mx-1 rounded bg-paper px-1.5 py-0.5 text-[12px]">role = &apos;admin&apos;</code>
              on your account.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold text-heading"
            >
              Back to dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  const disputedCount = stats?.disputedCount ?? 0;

  const tabItems: TabItem<typeof tab>[] = [
    { id: "overview", label: "Overview", icon: <Dot /> },
    {
      id: "disputes",
      label: "Disputes",
      count: disputedCount,
      attention: disputedCount > 0,
      icon: <Dot />,
    },
    { id: "revenue", label: "Revenue", icon: <Dot /> },
    { id: "users", label: "Users", count: users.length || undefined, icon: <Dot /> },
    { id: "tasks", label: "All tasks", count: allTasks.length || undefined, icon: <Dot /> },
  ];

  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* ------------------------------- HERO ------------------------------- */}
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-8 pt-11 sm:px-6 sm:pb-10 sm:pt-14">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="reveal inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
                  <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
                  Admin · operations
                </p>
                <h1 className="reveal reveal-1 mt-5 max-w-3xl font-display text-[2.05rem] font-medium leading-[1.03] tracking-[-0.02em] text-heading sm:text-[3rem]">
                  The <span className="gold-text">control room</span>.
                </h1>
                <p className="reveal reveal-2 mt-3 max-w-xl text-sm leading-relaxed text-ink/65 sm:text-[15px]">
                  Every rupee on this page is held in escrow until a human — you — decides. Read
                  the evidence, make the call, and the receipt writes itself.
                </p>
              </div>

              <div className="reveal reveal-2 flex flex-wrap gap-2 text-xs">
                <HeroChip label="Users" value={stats?.userCount ?? "—"} />
                <HeroChip label="Tasks" value={stats?.taskCount ?? "—"} />
                <HeroChip
                  label="Disputes"
                  value={disputedCount}
                  tone={disputedCount > 0 ? "alert" : undefined}
                />
                <HeroChip label="Escrow held" value={`Rs ${(stats?.escrowHeld ?? 0).toLocaleString()}`} />
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-5 pb-16 pt-6 sm:px-6 sm:pt-8">
          <Tabs
            items={tabItems}
            value={tab}
            onChange={setTab}
            ariaLabel="Admin sections"
            className="mb-6"
          />

          {loading && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-card/60" />
              ))}
            </div>
          )}

          {/* ----------------------------- OVERVIEW ---------------------------- */}
          {!loading && tab === "overview" && stats && (
            <div className="space-y-6" role="tabpanel" id="panel-overview" aria-labelledby="tab-overview">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard label="Total users" value={stats.userCount} hint="clients, providers, agents" />
                <StatCard label="Total tasks" value={stats.taskCount} hint="posted since day one" />
                <StatCard label="Completed" value={stats.completedCount} hint="escrow released" />
                <StatCard
                  label="Active disputes"
                  value={stats.disputedCount}
                  hint={stats.disputedCount > 0 ? "needs a human decision" : "nothing waiting"}
                  accent={stats.disputedCount > 0}
                />
                <StatCard
                  label="GMV released"
                  value={`Rs ${stats.gmv.toLocaleString()}`}
                  hint="mixed currencies, approx."
                />
                <StatCard
                  label="Escrow held"
                  value={`Rs ${stats.escrowHeld.toLocaleString()}`}
                  hint="not yet released"
                />
              </div>

              {stats.disputedCount > 0 && (
                <div className="card-lux flex flex-wrap items-center justify-between gap-4 rounded-2xl border-red-300/60 p-5 dark:border-red-500/25">
                  <div>
                    <p className="font-display text-lg text-heading">
                      {stats.disputedCount} job{stats.disputedCount === 1 ? "" : "s"} on hold
                    </p>
                    <p className="mt-1 text-sm text-ink/60">
                      Money is frozen until you decide. The AI mediator can read the whole thread
                      first.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab("disputes")}
                    className="sheen rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream"
                  >
                    Open disputes
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-3">
                <QuickLink
                  title="Set commission"
                  body="Applies to new payments only."
                  onClick={() => setTab("revenue")}
                />
                <QuickLink
                  title="Verify identities"
                  body="Review submitted CNIC / passport IDs."
                  onClick={() => setTab("users")}
                />
                <QuickLink
                  title="Audit every task"
                  body="Filter by status, open the chat."
                  onClick={() => setTab("tasks")}
                />
              </div>
            </div>
          )}

          {/* ------------------------------ REVENUE ---------------------------- */}
          {tab === "revenue" && (
            <div
              className="space-y-7"
              role="tabpanel"
              id="panel-revenue"
              aria-labelledby="tab-revenue"
            >
              {!revenue && <p className="text-sm text-ink/50">Loading…</p>}
              {revenue && (
                <>
                  <div className="card-lux relative overflow-hidden rounded-2xl p-6 sm:max-w-md">
                    <div className="gold-hairline absolute inset-x-6 top-0" aria-hidden="true" />
                    <h2 className="font-display text-lg text-heading">Commission rate</h2>
                    <p className="mt-1 text-xs leading-relaxed text-ink/55">
                      Applied to every new payment. Payments already in escrow or released keep the
                      rate that was in effect when they were created.
                    </p>
                    <form onSubmit={handleSaveRate} className="mt-4 flex items-center gap-3">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="50"
                          step="0.5"
                          aria-label="Commission percentage"
                          className="tnum w-28 rounded-xl border border-line bg-card px-3 py-2.5 pr-8 text-sm shadow-lux-sm outline-none focus:border-gold-500/60 focus:ring-2 focus:ring-gold-500/20"
                          value={newRate}
                          onChange={(e) => setNewRate(e.target.value)}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink/40">
                          %
                        </span>
                      </div>
                      <button
                        type="submit"
                        disabled={savingRate}
                        className="sheen rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream disabled:opacity-50"
                      >
                        {savingRate ? "Saving…" : "Save rate"}
                      </button>
                    </form>
                  </div>

                  <div>
                    <h2 className="mb-3 font-display text-lg text-heading">Commission earned</h2>
                    {revenue.earnedByCurrency.length === 0 ? (
                      <EmptyState text="No released payments yet — commission appears here the first time a job completes." />
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {revenue.earnedByCurrency.map((r) => (
                          <StatCard
                            key={r.currency}
                            label={`${r.currency} earned`}
                            value={`${r.currency} ${r.total.toLocaleString()}`}
                            hint={`${r.count} payment${r.count === 1 ? "" : "s"} released`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className="mb-3 font-display text-lg text-heading">Commission pending</h2>
                    {revenue.pendingByCurrency.length === 0 ? (
                      <EmptyState text="Nothing in escrow right now." />
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {revenue.pendingByCurrency.map((r) => (
                          <StatCard
                            key={r.currency}
                            label={`${r.currency} pending`}
                            value={`${r.currency} ${r.total.toLocaleString()}`}
                            hint={`${r.count} payment${r.count === 1 ? "" : "s"} in escrow`}
                            accent
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ----------------------------- DISPUTES ---------------------------- */}
          {!loading && tab === "disputes" && (
            <div
              className="space-y-4"
              role="tabpanel"
              id="panel-disputes"
              aria-labelledby="tab-disputes"
            >
              {disputes.length === 0 && (
                <EmptyState text="No active disputes. Every job on the platform is moving." />
              )}
              {disputes.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-red-300/50 bg-red-50/60 p-5 shadow-lux-sm dark:border-red-500/25 dark:bg-red-500/10"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/tasks/${t.id}`}
                        className="font-display text-lg text-heading hover:underline"
                      >
                        {t.title}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink/55">
                        <span className="font-semibold text-ink/70">
                          {formatMoney(t.budget, t.currency)}
                        </span>
                        <span>·</span>
                        <span>{t.city || "Remote"}</span>
                        <span>·</span>
                        <span className="capitalize">{t.postedByType.replace("_", " ")}</span>
                      </p>
                    </div>
                    <span className="rounded-full bg-red-500/10 px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-red-600 dark:text-red-300">
                      In escrow
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleResolve(t.id, "release_provider")}
                      className="whitespace-nowrap rounded-full bg-green-700 px-4 py-2 text-[13px] font-semibold text-cream hover:bg-green-800"
                    >
                      Release to provider
                    </button>
                    <button
                      onClick={() => handleResolve(t.id, "refund_client")}
                      className="whitespace-nowrap rounded-full border border-red-400 px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-500/10 dark:text-red-300"
                    >
                      Refund client
                    </button>
                    <Link
                      href={`/tasks/${t.id}`}
                      className="whitespace-nowrap rounded-full border border-line px-4 py-2 text-[13px] font-semibold text-ink/75 hover:border-green-700"
                    >
                      Full details
                    </Link>
                    <button
                      onClick={() => handleMediate(t.id)}
                      disabled={mediating === t.id}
                      className="whitespace-nowrap rounded-full bg-gold-500 px-4 py-2 text-[13px] font-semibold text-cream hover:bg-gold-600 disabled:opacity-50"
                    >
                      {mediating === t.id ? "Reading evidence…" : "✦ Mediate with AI"}
                    </button>
                  </div>

                  {briefs[t.id] && (
                    <div className="mt-4 rounded-xl border border-line bg-card p-4 text-sm">
                      {!briefs[t.id].available ? (
                        <p className="text-ink/60">
                          <strong className="text-heading">Mediator unavailable.</strong>{" "}
                          {briefs[t.id].reason}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em] ${
                                briefs[t.id].recommendation === "release_provider"
                                  ? "bg-green-700/10 text-green-700 dark:text-green-300"
                                  : briefs[t.id].recommendation === "refund_client"
                                    ? "bg-red-500/10 text-red-600 dark:text-red-300"
                                    : "bg-gold-500/15 text-gold-600 dark:text-gold-300"
                              }`}
                            >
                              {briefs[t.id].recommendation.replace(/_/g, " ")}
                            </span>
                            <span className="text-xs text-ink/50">
                              confidence {Math.round(briefs[t.id].confidence * 100)}% ·{" "}
                              {briefs[t.id].messageCount} messages read · {briefs[t.id].model}
                            </span>
                          </div>
                          <p className="text-ink/80">{briefs[t.id].summary}</p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-lg border border-line bg-paper/50 p-3">
                              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/45">
                                Client says
                              </p>
                              <p className="text-[13px] text-ink/75">{briefs[t.id].clientCase}</p>
                            </div>
                            <div className="rounded-lg border border-line bg-paper/50 p-3">
                              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/45">
                                Provider says
                              </p>
                              <p className="text-[13px] text-ink/75">{briefs[t.id].providerCase}</p>
                            </div>
                          </div>
                          {briefs[t.id].evidenceGaps.length > 0 && (
                            <div>
                              <p className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink/45">
                                Missing evidence
                              </p>
                              <ul className="list-inside list-disc text-[13px] text-ink/70">
                                {briefs[t.id].evidenceGaps.map((g) => (
                                  <li key={g}>{g}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <p className="text-[13px] text-ink/75">
                            <strong className="text-heading">Why:</strong> {briefs[t.id].rationale}
                          </p>
                          <p className="rounded-lg bg-gold-100/50 px-3 py-2 text-[12.5px] text-gold-600 dark:bg-gold-500/10 dark:text-gold-300">
                            ⚖ {briefs[t.id].fairnessNote}
                          </p>
                          <p className="text-[11px] text-ink/40">
                            Advisory only — the AI never moves money. You press the button.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ------------------------------- USERS ----------------------------- */}
          {!loading && tab === "users" && (
            <div role="tabpanel" id="panel-users" aria-labelledby="tab-users">
              {users.length === 0 && <EmptyState text="No users loaded yet." />}

              {/* desktop table */}
              <div className="card-lux hidden overflow-hidden rounded-2xl lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.12em] text-ink/45">
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Contact</th>
                      <th className="px-4 py-3 font-semibold">Role</th>
                      <th className="px-4 py-3 font-semibold">City</th>
                      <th className="px-4 py-3 font-semibold">ID</th>
                      <th className="px-4 py-3 font-semibold">Rating</th>
                      <th className="px-4 py-3 font-semibold">Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-line/60 last:border-0">
                        <td className="px-4 py-3 font-medium text-heading">{u.name}</td>
                        <td className="px-4 py-3 text-ink/65">{u.phone || u.email || "—"}</td>
                        <td className="px-4 py-3">
                          <RolePill role={u.role} />
                        </td>
                        <td className="px-4 py-3 text-ink/65">{u.city || "—"}</td>
                        <td className="px-4 py-3 text-ink/65">
                          {u.idNumber ? (
                            <span title={u.idNumber}>
                              {u.country} · {u.idType?.replace("_", " ")}
                            </span>
                          ) : (
                            <span className="text-ink/30">—</span>
                          )}
                        </td>
                        <td className="tnum px-4 py-3 text-ink/65">
                          {u.ratingCount > 0 ? `${u.ratingAvg.toFixed(1)} ★ (${u.ratingCount})` : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <VerifyButton
                            hasId={!!u.idNumber}
                            verified={u.cnicVerified}
                            onToggle={() => handleVerify(u.id, !u.cnicVerified)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* phone / tablet cards */}
              <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
                {users.map((u) => (
                  <div key={u.id} className="card-lux rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-heading">{u.name}</p>
                      <RolePill role={u.role} />
                    </div>
                    <p className="mt-1 text-xs text-ink/55">{u.phone || u.email || "no contact"}</p>
                    <p className="mt-2 text-xs text-ink/45">
                      {u.city || "no city"} ·{" "}
                      {u.ratingCount > 0 ? `${u.ratingAvg.toFixed(1)} ★ (${u.ratingCount})` : "no ratings"}
                      {u.idNumber ? ` · ${u.country} ${u.idType?.replace("_", " ")}` : " · no ID"}
                    </p>
                    <div className="mt-3">
                      <VerifyButton
                        hasId={!!u.idNumber}
                        verified={u.cnicVerified}
                        onToggle={() => handleVerify(u.id, !u.cnicVerified)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------- TASKS ----------------------------- */}
          {!loading && tab === "tasks" && (
            <div role="tabpanel" id="panel-tasks" aria-labelledby="tab-tasks" className="space-y-2">
              {allTasks.length === 0 && <EmptyState text="No tasks yet." />}
              {allTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="card-lux flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm transition-transform hover:-translate-y-0.5 hover:border-gold-500/40"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-heading">{t.title}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <StatusPill status={t.status} />
                    <span className="tnum text-ink/60">{formatMoney(t.budget, t.currency)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

/* -------------------------------- pieces -------------------------------- */

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />;
}

function HeroChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "alert";
}) {
  return (
    <span
      className={`inline-flex items-baseline gap-2 rounded-full border px-3.5 py-1.5 font-medium shadow-lux-sm ${
        tone === "alert"
          ? "border-red-400/50 bg-red-500/10 text-red-600 dark:text-red-300"
          : "border-line bg-card/80 text-ink/70"
      }`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] opacity-60">
        {label}
      </span>
      <span className="tnum text-[13px] font-bold">{value}</span>
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card-lux relative overflow-hidden rounded-2xl p-5 ${
        accent ? "border-red-300/60 dark:border-red-500/25" : ""
      }`}
    >
      <div className="gold-hairline absolute inset-x-5 top-0 opacity-60" aria-hidden="true" />
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/45">{label}</p>
      <p
        className={`tnum mt-2 font-display text-[1.75rem] leading-none ${
          accent ? "text-red-600 dark:text-red-300" : "text-heading"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[11.5px] text-ink/45">{hint}</p>}
    </div>
  );
}

function QuickLink({
  title,
  body,
  onClick,
}: {
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="card-lux lift rounded-xl p-4 text-left transition-transform"
    >
      <p className="font-display text-[15px] text-heading">{title} →</p>
      <p className="mt-1 text-[12.5px] text-ink/55">{body}</p>
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line/90 bg-card/50 px-6 py-10 text-center">
      <p className="text-sm text-ink/55">{text}</p>
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  const tone =
    role === "admin"
      ? "bg-gold-500/15 text-gold-600 dark:text-gold-300"
      : role === "provider"
        ? "bg-green-700/10 text-green-700 dark:text-green-300"
        : "bg-ink/8 text-ink/60";
  return (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${tone}`}
    >
      {role}
    </span>
  );
}

function VerifyButton({
  hasId,
  verified,
  onToggle,
}: {
  hasId: boolean;
  verified: boolean;
  onToggle: () => void;
}) {
  if (!hasId) return <span className="text-xs text-ink/30">No ID</span>;
  return (
    <button
      onClick={onToggle}
      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        verified
          ? "bg-green-700/10 text-green-700 hover:bg-red-500/10 hover:text-red-600 dark:text-green-300"
          : "bg-gold-500/15 text-gold-600 hover:bg-gold-500 hover:text-cream dark:text-gold-300"
      }`}
    >
      {verified ? "✓ Verified (undo)" : "Verify ID"}
    </button>
  );
}

const STATUS_TONE: Record<string, string> = {
  open: "bg-green-700/10 text-green-700 dark:text-green-300",
  assigned: "bg-gold-500/15 text-gold-600 dark:text-gold-300",
  submitted: "bg-gold-500/15 text-gold-600 dark:text-gold-300",
  completed: "bg-green-800/10 text-green-800 dark:text-green-300",
  disputed: "bg-red-500/10 text-red-600 dark:text-red-300",
  cancelled: "bg-ink/8 text-ink/55",
  expired: "bg-ink/8 text-ink/55",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${
        STATUS_TONE[status] || "bg-ink/8 text-ink/55"
      }`}
    >
      {status}
    </span>
  );
}
