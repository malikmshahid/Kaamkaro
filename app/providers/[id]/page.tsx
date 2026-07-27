"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Provider = {
  id: string;
  name: string;
  city: string | null;
  bio: string | null;
  skills: string | null;
  ratingAvg: number;
  ratingCount: number;
  cnicVerified: boolean;
  createdAt: string;
};

type Tool = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryDays: number;
  orderCount: number;
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewerName: string | null;
};

function levelBadge(completedCount: number) {
  if (completedCount >= 30) return { label: "Legend", emoji: "🏆" };
  if (completedCount >= 10) return { label: "Pro", emoji: "🔥" };
  if (completedCount >= 3) return { label: "Rising Star", emoji: "⭐" };
  return { label: "Rookie", emoji: "🌱" };
}

export default function ProviderProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/providers/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setProvider(data.provider);
        setTools(data.tools || []);
        setReviews(data.reviews || []);
        setCompletedCount(data.completedCount || 0);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
          <p className="text-ink/50">Loading...</p>
        </main>
      </>
    );
  }

  if (!provider) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
          <p className="text-ink/50">This profile couldn&apos;t be found.</p>
        </main>
      </>
    );
  }

  const badge = levelBadge(completedCount);

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-16">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-4xl text-heading">{provider.name}</h1>
              <span className="text-xs px-3 py-1 rounded-full bg-gold-100 text-gold-500 font-semibold whitespace-nowrap">
                {badge.emoji} {badge.label}
              </span>
              {provider.cnicVerified && (
                <span className="text-xs px-3 py-1 rounded-full bg-green-950/5 text-green-800 font-semibold whitespace-nowrap">
                  ✓ Verified
                </span>
              )}
            </div>
            <p className="text-ink/60">
              {provider.city || "Location not set"} &middot;{" "}
              {provider.ratingCount > 0
                ? `${provider.ratingAvg.toFixed(1)} ⭐ (${provider.ratingCount} reviews)`
                : "No reviews yet"}{" "}
              &middot; {completedCount} tasks completed
            </p>
          </div>
        </div>

        {provider.bio && (
          <p className="text-ink/70 leading-relaxed mb-10 max-w-2xl">{provider.bio}</p>
        )}

        {tools.length > 0 && (
          <section className="mb-12">
            <h2 className="font-display text-2xl text-heading mb-4">
              🧰 Toolbox Listings
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {tools.map((t) => (
                <Link
                  key={t.id}
                  href={`/tools/${t.id}`}
                  className="border border-line rounded-xl p-5 bg-card hover:border-gold-500 transition-colors"
                >
                  <p className="font-semibold text-heading mb-1">{t.title}</p>
                  <p className="text-sm text-ink/60 line-clamp-2 mb-3">{t.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-green-800">
                      Rs. {t.price.toLocaleString()}
                    </span>
                    <span className="text-ink/50">{t.orderCount} orders</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="font-display text-2xl text-heading mb-4">Reviews</h2>
          {reviews.length === 0 && (
            <p className="text-sm text-ink/50">No reviews yet — this provider is just getting started.</p>
          )}
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="border border-line rounded-xl p-4 bg-card">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-gold-500">{"⭐".repeat(r.rating)}</p>
                  <p className="text-xs text-ink/40">{r.reviewerName}</p>
                </div>
                {r.comment && <p className="text-sm text-ink/60">{r.comment}</p>}
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
