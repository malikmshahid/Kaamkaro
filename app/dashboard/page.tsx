"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

type PostedTask = {
  id: string;
  title: string;
  budget: number;
  status: string;
};

type MyApplication = {
  applicationId: string;
  applicationStatus: string;
  taskId: string;
  taskTitle: string;
  taskBudget: number;
  taskStatus: string;
};

type MyTool = {
  id: string;
  title: string;
  price: number;
  status: string;
  orderCount: number;
};

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => {
        setPostedTasks(data.postedTasks || []);
        setMyApplications(data.myApplications || []);
        setMyTools(data.myTools || []);
      })
      .finally(() => setLoading(false));
  }, [user, userLoading]);

  if (!userLoading && !user) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
          <p className="text-ink/60">
            <a href="/login" className="text-green-700 underline">
              Log in
            </a>{" "}
            to see your dashboard.
          </p>
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
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-3xl text-heading">
            Hey, {user?.name?.split(" ")[0]}
          </h1>
          <span className="text-xs px-3 py-1 rounded-full bg-gold-100 text-gold-500 font-semibold">
            {badge.emoji} {badge.label}
          </span>
        </div>
        <p className="text-ink/60 mb-10">
          {user?.city ? `${user.city} · ` : ""}Rating:{" "}
          {user?.ratingCount ? `${user.ratingAvg.toFixed(1)} ⭐` : "No ratings yet"}
        </p>

        {loading && <p className="text-ink/50">Loading...</p>}

        {!loading && (
          <div className="grid md:grid-cols-2 gap-10">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-heading">
                  Your Posted Tasks
                </h2>
                <Link
                  href="/tasks/new"
                  className="text-sm text-green-700 underline"
                >
                  + New
                </Link>
              </div>
              {postedTasks.length === 0 && (
                <p className="text-sm text-ink/50">No tasks posted yet.</p>
              )}
              <div className="space-y-3">
                {postedTasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    className="block border border-line rounded-xl p-4 bg-card hover:border-green-700"
                  >
                    <p className="font-semibold">{t.title}</p>
                    <p className="text-sm text-ink/50">
                      Rs. {t.budget.toLocaleString()} &middot; {t.status}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-display text-xl text-heading mb-4">
                Your Applications
              </h2>
              {myApplications.length === 0 && (
                <p className="text-sm text-ink/50">
                  You haven&apos;t applied to anything yet.
                </p>
              )}
              <div className="space-y-3">
                {myApplications.map((a) => (
                  <Link
                    key={a.applicationId}
                    href={`/tasks/${a.taskId}`}
                    className="block border border-line rounded-xl p-4 bg-card hover:border-green-700"
                  >
                    <p className="font-semibold">{a.taskTitle}</p>
                    <p className="text-sm text-ink/50">
                      Rs. {a.taskBudget.toLocaleString()} &middot; Application:{" "}
                      {a.applicationStatus}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}

        {!loading && (
          <section className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-heading">
                🧰 Your Toolbox Listings
              </h2>
              <Link href="/tools/new" className="text-sm text-green-700 underline">
                + List a Tool
              </Link>
            </div>
            {myTools.length === 0 && (
              <p className="text-sm text-ink/50">
                Nothing listed yet — turn your skills into an instant-order gig.
              </p>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              {myTools.map((t) => (
                <Link
                  key={t.id}
                  href={`/tools/${t.id}`}
                  className="block border border-line rounded-xl p-4 bg-card hover:border-green-700"
                >
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-sm text-ink/50">
                    Rs. {t.price.toLocaleString()} &middot; {t.orderCount} orders &middot; {t.status}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
