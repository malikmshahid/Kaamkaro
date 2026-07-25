"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function NewToolPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "design",
    price: "",
    deliveryDays: "1",
    city: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
          deliveryDays: Number(form.deliveryDays),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      router.push(`/tools/${data.toolId}`);
    } catch {
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-xl mx-auto w-full px-6 py-16">
        <h1 className="font-display text-3xl text-heading mb-2">
          🧰 List a Tool
        </h1>
        <p className="text-ink/60 mb-8">
          Package up something you&apos;re good at as a fixed-price, instant-order
          gig — no waiting for applications.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Tool Title</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="e.g. I'll design a logo for your business"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-700 min-h-32"
              placeholder="Describe exactly what a buyer gets when they order this..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Category</label>
              <select
                className="w-full border border-line rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                <option value="delivery">Delivery</option>
                <option value="design">Design</option>
                <option value="coding">Coding / IT</option>
                <option value="writing">Writing</option>
                <option value="home">Home Services</option>
                <option value="verification">Verification / Photo</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Price (Rs.)</label>
              <input
                type="number"
                min="1"
                className="w-full border border-line rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Delivery Time (days)</label>
              <input
                type="number"
                min="1"
                className="w-full border border-line rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
                value={form.deliveryDays}
                onChange={(e) => setForm({ ...form, deliveryDays: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-1">City (optional)</label>
              <input
                className="w-full border border-line rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="Leave blank if fully remote"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-gold-500 text-cream px-6 py-3 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Listing..." : "List This Tool"}
          </button>
        </form>
      </main>
    </>
  );
}
