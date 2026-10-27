"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import PayoutPanel from "@/components/PayoutPanel";
import { useUser } from "@/lib/useUser";
import { formatMoney } from "@/lib/currency";

type PostedTask = {
  id: string;
  title: string;
  budget: number;
  currency: string;
  status: string;
};

type MyApplication = {
  applicationId: string;
  applicationStatus: string;
  taskId: string;
  taskTitle: string;
  taskBudget: number;
  taskCurrency: string;
  taskStatus: string;
};

type MyTool = {
  id: string;
  title: string;
  price: number;
  currency: string;
  status: string;
  orderCount: number;
};

type SavedTask = { id: string; title: string; budget: number; currency: string };
type SavedTool = { id: string; title: string; price: number; currency: string };

function levelBadge(completedCount: number) {
  if (completedCount >= 30) return { label: "Legend", emoji: "🏆" };
  if (completedCount >= 10) return { label: "Pro", emoji: "🔥" };
  if (completedCount >= 3) return { label: "Rising Star", emoji: "⭐" };
  return { label: "Rookie", emoji: "🌱" };
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [postedTasks, setPostedTasks] = useState<PostedTask[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [myTools, setMyTools] = useState<MyTool[]>([]);
  const [savedTasks, setSavedTasks] = useState<SavedTask[]>([]);
  const [savedTools, setSavedTools] = useState<SavedTool[]>([]);
  const [referralCode, setReferralCode] = useState("");
  const [referredCount, setReferredCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch("/api/dashboard").then((r) => r.json()),
      fetch("/api/saved").then((r) => r.json()),
      fetch("/api/referrals").then((r) => r.json()),
    ])
      .then(([dash, saved, ref]) => {
        setPostedTasks(dash.postedTasks || []);
        setMyApplications(dash.myApplications || []);
        setMyTools(dash.myTools || []);
        setSavedTasks(saved.tasks || []);
        setSavedTools(saved.tools || []);
        setReferralCode(ref.referralCode || "");
        setReferredCount(ref.referredCount || 0);
      })
      .finally(() => setLoading(false));
  }, [user, userLoading]);

  if (!userLoading && !user) {
    return (
      <>
        <Navbar />
        <main className="aurora grain relative isolate mx-auto w-full max-w-3xl flex-1 px-5 py-24 text-center sm:px-6">
          <div className="card-lux mx-auto max-w-md p-8">
            <p className="font-display text-[1.6rem] leading-tight text-heading">
              Log in to see your dashboard
            </p>
            <p className="mt-2 text-sm text-ink/60">
              Your tasks, proposals, listings and payouts all live here.
            </p>
            <Link
              href="/login?next=/dashboard"
              className="sheen mt-6 inline-block rounded-full bg-green-900 px-6 py-3 text-sm font-semibold text-cream shadow-lux-sm transition-transform hover:-translate-y-0.5 hover:bg-green-800"
            >
              Log in
            </Link>
          </div>
        </main>
      </>
    );
  }

  const completedCount = postedTasks.filter((t) => t.status === "completed").length +
    myApplications.filter((a) => a.taskStatus === "completed").length;
  const badge = levelBadge(completedCount);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-5xl px-5 pb-8 pt-10 sm:px-6 sm:pb-9 sm:pt-14">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
              Your dashboard
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[2rem] font-medium leading-tight tracking-[-0.02em] text-heading sm:text-[2.6rem]">
                Hey, {user?.name?.split(" ")[0]}
              </h1>
              <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-gold-600 dark:bg-gold-500/15 dark:text-gold-300">
                {badge.emoji} {badge.label}
              </span>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/55">
              {user?.city ? <span>{user.city}</span> : null}
              {user?.city ? <span>·</span> : null}
              <span>
                {user?.ratingCount
                  ? `${user.ratingAvg.toFixed(1)} ★ rating`
                  : "No ratings yet"}
              </span>
              <span>·</span>
              <span>{completedCount} tasks completed</span>
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
        {loading && (
          <div className="animate-pulse space-y-3">
            <div className="h-20 rounded-2xl bg-line/40" />
            <div className="h-20 rounded-2xl bg-line/40" />
          </div>
        )}

        {!loading && (
          <div className="grid gap-5 md:grid-cols-2">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-[1.15rem] text-heading">Your posted tasks</h2>
                <Link
                  href="/tasks/new"
                  className="rounded-full border border-green-900/25 px-3.5 py-1.5 text-xs font-semibold text-green-800 transition-colors hover:bg-green-900 hover:text-cream dark:border-green-300/30 dark:text-green-300 dark:hover:bg-green-500/20 dark:hover:text-cream"
                >
                  + New task
                </Link>
              </div>
              {postedTasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line bg-card/50 px-4 py-6 text-center">
                  <p className="text-sm text-ink/50">No tasks posted yet.</p>
                </div>
              )}
              <div className="space-y-3">
                {postedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-2xl border border-line bg-card p-4 shadow-lux-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-lux"
                  >
                    <Link href={`/tasks/${t.id}`} className="block">
                      <p className="font-semibold">{t.title}</p>
                      <p className="text-sm text-ink/50">
                        {formatMoney(t.budget, t.currency)} &middot; {t.status}
                      </p>
                    </Link>
                    {t.status === "completed" && (
                      <Link
                        href={`/receipt/${t.id}`}
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-100/40 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold-600 transition hover:bg-gold-500 hover:text-cream dark:bg-gold-500/10 dark:text-gold-300"
                      >
                        View receipt ↗
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 font-display text-[1.15rem] text-heading">Your applications</h2>
              {myApplications.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line bg-card/50 px-4 py-6 text-center">
                  <p className="text-sm text-ink/50">
                    You haven&apos;t applied to anything yet.
                  </p>
                </div>
              )}
              <div className="space-y-3">
                {myApplications.map((a) => (
                  <div
                    key={a.applicationId}
                    className="rounded-2xl border border-line bg-card p-4 shadow-lux-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-lux"
                  >
                    <Link href={`/tasks/${a.taskId}`} className="block">
                      <p className="font-semibold">{a.taskTitle}</p>
                      <p className="text-sm text-ink/50">
                        {formatMoney(a.taskBudget, a.taskCurrency)} &middot; Application:{" "}
                        {a.applicationStatus}
                      </p>
                    </Link>
                    {a.taskStatus === "completed" && (
                      <Link
                        href={`/receipt/${a.taskId}`}
                        className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-100/40 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold-600 transition hover:bg-gold-500 hover:text-cream dark:bg-gold-500/10 dark:text-gold-300"
                      >
                        View receipt ↗
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {!loading && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-[1.15rem] text-heading">Your Toolbox listings</h2>
              <Link
                href="/tools/new"
                className="rounded-full border border-gold-500/40 px-3.5 py-1.5 text-xs font-semibold text-gold-600 transition-colors hover:bg-gold-500 hover:text-cream dark:text-gold-300"
              >
                + List a service
              </Link>
            </div>
            {myTools.length === 0 && (
              <div className="rounded-2xl border border-dashed border-line bg-card/50 px-4 py-6 text-center">
                <p className="text-sm text-ink/50">
                  Nothing listed yet — turn your skills into an instant-order gig.
                </p>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              {myTools.map((t) => (
                <Link
                  key={t.id}
                  href={`/tools/${t.id}`}
                  className="block rounded-2xl border border-line bg-card p-4 shadow-lux-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-lux"
                >
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-sm text-ink/50">
                    {formatMoney(t.price, t.currency)} &middot; {t.orderCount} orders &middot; {t.status}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && <PayoutPanel />}

        {!loading && (savedTasks.length > 0 || savedTools.length > 0) && (
          <section className="mt-10">
            <h2 className="mb-4 font-display text-[1.15rem] text-heading">Saved</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {savedTasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  className="block rounded-2xl border border-line bg-card p-4 shadow-lux-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-lux"
                >
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-sm text-ink/50">
                    {formatMoney(t.budget, t.currency)} &middot; Task
                  </p>
                </Link>
              ))}
              {savedTools.map((t) => (
                <Link
                  key={t.id}
                  href={`/tools/${t.id}`}
                  className="block rounded-2xl border border-line bg-card p-4 shadow-lux-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-gold-500/40 hover:shadow-lux"
                >
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-sm text-ink/50">
                    {formatMoney(t.price, t.currency)} &middot; Toolbox
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {!loading && referralCode && (
          <section className="mt-8 relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-br from-gold-100/80 to-card p-6 dark:from-gold-500/10 dark:to-card">
            <div className="gold-hairline absolute inset-x-6 top-0 opacity-70" aria-hidden="true" />
            <h2 className="mb-2 font-display text-[1.15rem] text-heading">Invite friends</h2>
            <p className="text-sm text-ink/60 mb-4">
              Share your referral link — you&apos;ve brought{" "}
              <strong>{referredCount}</strong> {referredCount === 1 ? "person" : "people"} to
              KaamKaro so far.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="bg-card border border-line rounded-lg px-4 py-2 text-sm">
                {typeof window !== "undefined" ? window.location.origin : ""}/signup?ref={referralCode}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/signup?ref=${referralCode}`
                  );
                }}
                className="rounded-full bg-green-900 px-4 py-2 text-sm font-semibold text-cream shadow-lux-sm transition-transform hover:-translate-y-0.5 hover:bg-green-800"
              >
                Copy link
              </button>
            </div>
          </section>
        )}
        </div>
      </main>
    </>
  );
}
