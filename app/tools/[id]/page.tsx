"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useUser } from "@/lib/useUser";

type Tool = {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryDays: number;
  city: string | null;
  status: string;
  orderCount: number;
  providerName: string | null;
  providerRating: number;
  providerRatingCount: number;
  providerCity: string | null;
};

export default function ToolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useUser();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/tools/${id}`)
      .then((r) => r.json())
      .then((data) => setTool(data.tool))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleOrder() {
    setOrdering(true);
    setError("");
    const res = await fetch(`/api/tools/${id}/order`, { method: "POST" });
    const data = await res.json();
    setOrdering(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.push(`/tasks/${data.taskId}`);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
          <p className="text-ink/50">Loading...</p>
        </main>
      </>
    );
  }

  if (!tool) {
    return (
      <>
        <Navbar />
        <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
          <p className="text-ink/50">This tool couldn&apos;t be found.</p>
        </main>
      </>
    );
  }

  const isOwnTool = user && user.id === tool.providerId;

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <span className="text-xs uppercase tracking-wide text-gold-500">
          {tool.category} &middot; 🧰 Toolbox listing
        </span>
        <h1 className="font-display text-4xl text-heading mt-2 mb-4">
          {tool.title}
        </h1>
        <p className="text-ink/70 leading-relaxed mb-6 whitespace-pre-wrap">
          {tool.description}
        </p>

        <div className="flex gap-8 text-sm mb-8 border-y border-line py-4">
          <div>
            <p className="text-ink/50">Price</p>
            <p className="font-semibold text-green-800 text-lg">
              Rs. {tool.price.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-ink/50">Delivery Time</p>
            <p className="font-semibold text-lg">{tool.deliveryDays} day(s)</p>
          </div>
          <div>
            <p className="text-ink/50">Location</p>
            <p className="font-semibold text-lg">{tool.city || "Remote"}</p>
          </div>
          <div>
            <p className="text-ink/50">Orders So Far</p>
            <p className="font-semibold text-lg">{tool.orderCount}</p>
          </div>
        </div>

        <div className="border border-line rounded-xl p-6 bg-card mb-8">
          <p className="text-xs text-ink/50 uppercase tracking-wide mb-1">Provider</p>
          <p className="font-semibold text-heading text-lg">{tool.providerName}</p>
          <p className="text-sm text-ink/50">
            {tool.providerCity || "Location not set"} &middot;{" "}
            {tool.providerRatingCount > 0
              ? `${tool.providerRating.toFixed(1)} ⭐ (${tool.providerRatingCount} reviews)`
              : "New provider — no reviews yet"}
          </p>
        </div>

        {error && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
            {error}
          </p>
        )}

        {!user && (
          <p className="text-ink/60">
            <a href="/login" className="text-green-700 underline">
              Log in
            </a>{" "}
            to order this tool.
          </p>
        )}

        {user && isOwnTool && (
          <p className="text-ink/60 text-sm italic">
            This is your own listing — you can&apos;t order it yourself.
          </p>
        )}

        {user && !isOwnTool && (
          <button
            onClick={handleOrder}
            disabled={ordering}
            className="rounded-full bg-gold-500 text-cream px-8 py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {ordering ? "Placing order..." : `Order Now — Rs. ${tool.price.toLocaleString()}`}
          </button>
        )}
      </main>
    </>
  );
}
