"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

type Tool = {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  deliveryDays: number;
  city: string | null;
  orderCount: number;
  providerName: string | null;
  providerRating: number | null;
  providerRatingCount: number | null;
};

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");

  useEffect(() => {
    const url = category
      ? `/api/tools?category=${encodeURIComponent(category)}`
      : "/api/tools";
    setLoading(true);
    fetch(url)
      .then((r) => r.json())
      .then((data) => setTools(data.tools || []))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="flex items-start justify-between mb-2 flex-wrap gap-4">
          <div>
            <h1 className="font-display text-3xl text-heading">
              🧰 The Toolbox
            </h1>
            <p className="text-ink/60 mt-1">
              Ready-to-order services from Pakistani providers — no waiting for
              applicants, just order and go.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="border border-line rounded-lg px-3 py-2 bg-card text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="delivery">Delivery</option>
              <option value="design">Design</option>
              <option value="coding">Coding / IT</option>
              <option value="writing">Writing</option>
              <option value="home">Home Services</option>
              <option value="verification">Verification / Photo</option>
              <option value="other">Other</option>
            </select>
            <Link
              href="/tools/new"
              className="rounded-full bg-gold-500 text-cream px-4 py-2 text-sm hover:opacity-90 whitespace-nowrap"
            >
              + List a Tool
            </Link>
          </div>
        </div>

        <div className="mt-8">
          {loading && <p className="text-ink/50">Loading...</p>}

          {!loading && tools.length === 0 && (
            <div className="border border-dashed border-line rounded-xl p-12 text-center text-ink/50">
              The Toolbox is empty right now — be the first provider to list a
              gig! 🧰
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-5">
            {tools.map((tool) => (
              <Link
                key={tool.id}
                href={`/tools/${tool.id}`}
                className="border border-line rounded-xl p-6 bg-card hover:border-gold-500 transition-colors flex flex-col"
              >
                <span className="text-xs text-ink/50 mb-2">{tool.category}</span>
                <h3 className="font-display text-lg text-heading mb-2">
                  {tool.title}
                </h3>
                <p className="text-sm text-ink/60 line-clamp-2 mb-4 flex-1">
                  {tool.description}
                </p>
                <div className="flex items-center justify-between text-xs text-ink/50 mb-3">
                  <span>{tool.providerName}</span>
                  {tool.providerRatingCount ? (
                    <span>{tool.providerRating?.toFixed(1)} ⭐ ({tool.providerRatingCount})</span>
                  ) : (
                    <span>New provider</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-800">
                    Rs. {tool.price.toLocaleString()}
                  </span>
                  <span className="text-xs text-ink/50">
                    {tool.deliveryDays}d delivery
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
