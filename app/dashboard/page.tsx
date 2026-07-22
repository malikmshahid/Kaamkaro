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

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const [postedTasks, setPostedTasks] = useState<PostedTask[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
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
      })
      .finally(() => setLoading(false));
  }, [user, userLoading]);

  if (!userLoading && !user) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
          <p className="text-ink/60">
            Dashboard dekhne ke liye{" "}
            <a href="/login" className="text-green-700 underline">
              login karein
            </a>
            .
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <h1 className="font-display text-3xl text-heading mb-2">
          Assalam-o-Alaikum, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-ink/60 mb-10">
          {user?.city ? `${user.city} · ` : ""}Rating:{" "}
          {user?.ratingCount ? `${user.ratingAvg.toFixed(1)} ⭐` : "Abhi koi rating nahi"}
        </p>

        {loading && <p className="text-ink/50">Load ho raha hai...</p>}

        {!loading && (
          <div className="grid md:grid-cols-2 gap-10">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl text-heading">
                  Aapke Posted Kaam
                </h2>
                <Link
                  href="/tasks/new"
                  className="text-sm text-green-700 underline"
                >
                  + Naya
                </Link>
              </div>
              {postedTasks.length === 0 && (
                <p className="text-sm text-ink/50">Koi kaam post nahi kiya.</p>
              )}
              <div className="space-y-3">
                {postedTasks.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tasks/${t.id}`}
                    className="block border border-line rounded-xl p-4 bg-white hover:border-green-700"
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
                Aapki Applications
              </h2>
              {myApplications.length === 0 && (
                <p className="text-sm text-ink/50">
                  Abhi tak kisi kaam pe apply nahi kiya.
                </p>
              )}
              <div className="space-y-3">
                {myApplications.map((a) => (
                  <Link
                    key={a.applicationId}
                    href={`/tasks/${a.taskId}`}
                    className="block border border-line rounded-xl p-4 bg-white hover:border-green-700"
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
      </main>
    </>
  );
}
