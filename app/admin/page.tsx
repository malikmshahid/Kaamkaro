"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

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
  phone: string;
  role: string;
  city: string | null;
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
  postedByType: string;
  city: string | null;
  createdAt: string;
};

export default function AdminPage() {
  const { user, loading: userLoading } = useUser();
  const [tab, setTab] = useState<"overview" | "disputes" | "users" | "tasks">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [disputes, setDisputes] = useState<AdminTask[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allTasks, setAllTasks] = useState<AdminTask[]>([]);
  const [forbidden, setForbidden] = useState(false);
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

  useEffect(() => {
    if (!userLoading && user) loadAll();
    if (!userLoading && !user) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userLoading]);

  useEffect(() => {
    if (tab === "users" && users.length === 0) loadUsers();
    if (tab === "tasks" && allTasks.length === 0) loadTasks();
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

  if (!userLoading && !user) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
          <p className="text-ink/60">
            <a href="/login" className="text-green-700 underline">
              Log in
            </a>{" "}
            to view the admin panel.
          </p>
        </main>
      </>
    );
  }

  if (forbidden) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
          <p className="text-ink/60">
            This page is admin-only. If you need admin access, your role has to
            be updated directly in the database.
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
        <h1 className="font-display text-3xl text-heading mb-2">Admin Panel</h1>
        <p className="text-ink/60 mb-8">Platform overview and dispute resolution.</p>

        <div className="flex gap-2 mb-8 border-b border-line">
          {(["overview", "disputes", "users", "tasks"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm capitalize border-b-2 -mb-px ${
                tab === t
                  ? "border-green-800 text-green-800 font-semibold"
                  : "border-transparent text-ink/50 hover:text-ink"
              }`}
            >
              {t === "overview" ? "Overview" : t === "disputes" ? `Disputes${stats && stats.disputedCount > 0 ? ` (${stats.disputedCount})` : ""}` : t === "users" ? "Users" : "All Tasks"}
            </button>
          ))}
        </div>

        {loading && <p className="text-ink/50">Loading...</p>}

        {!loading && tab === "overview" && stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Total Users" value={stats.userCount} />
            <StatCard label="Total Tasks" value={stats.taskCount} />
            <StatCard label="Completed" value={stats.completedCount} />
            <StatCard label="Active Disputes" value={stats.disputedCount} accent={stats.disputedCount > 0} />
            <StatCard label="GMV (Released)" value={`Rs. ${stats.gmv.toLocaleString()}`} />
            <StatCard label="Escrow Held" value={`Rs. ${stats.escrowHeld.toLocaleString()}`} />
          </div>
        )}

        {!loading && tab === "disputes" && (
          <div className="space-y-4">
            {disputes.length === 0 && (
              <p className="text-sm text-ink/50">No active disputes. 🎉</p>
            )}
            {disputes.map((t) => (
              <div key={t.id} className="border border-red-200 bg-red-50/50 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <Link href={`/tasks/${t.id}`} className="font-semibold text-heading hover:underline">
                      {t.title}
                    </Link>
                    <p className="text-sm text-ink/50">
                      Rs. {t.budget.toLocaleString()} · {t.city || "Remote"} · {t.postedByType}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleResolve(t.id, "release_provider")}
                    className="rounded-full bg-green-900 text-cream px-4 py-2 text-sm hover:bg-green-800"
                  >
                    Release to Provider
                  </button>
                  <button
                    onClick={() => handleResolve(t.id, "refund_client")}
                    className="rounded-full border border-red-400 text-red-600 px-4 py-2 text-sm hover:bg-red-100"
                  >
                    Refund Client
                  </button>
                  <Link
                    href={`/tasks/${t.id}`}
                    className="rounded-full border border-line px-4 py-2 text-sm hover:border-green-700"
                  >
                    View Full Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/50 border-b border-line">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">City</th>
                  <th className="py-2 pr-4">Rating</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-line/50">
                    <td className="py-2 pr-4">{u.name}</td>
                    <td className="py-2 pr-4">{u.phone}</td>
                    <td className="py-2 pr-4 capitalize">{u.role}</td>
                    <td className="py-2 pr-4">{u.city || "—"}</td>
                    <td className="py-2 pr-4">
                      {u.ratingCount > 0 ? `${u.ratingAvg.toFixed(1)} ⭐ (${u.ratingCount})` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === "tasks" && (
          <div className="space-y-2">
            {allTasks.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="flex items-center justify-between border border-line rounded-lg p-3 bg-white hover:border-green-700 text-sm"
              >
                <span className="font-medium">{t.title}</span>
                <span className="text-ink/50">
                  Rs. {t.budget.toLocaleString()} · {t.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className={`border rounded-xl p-5 bg-white ${accent ? "border-red-300" : "border-line"}`}>
      <p className="text-xs text-ink/50 uppercase tracking-wide mb-1">{label}</p>
      <p className={`font-display text-2xl ${accent ? "text-red-600" : "text-heading"}`}>{value}</p>
    </div>
  );
}
