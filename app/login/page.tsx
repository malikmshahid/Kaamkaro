"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not log in");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-md mx-auto w-full px-6 py-16">
        <h1 className="font-display text-3xl text-heading mb-2">Welcome Back</h1>
        <p className="text-ink/60 mb-8">Log in to pick up where you left off.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Phone Number</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-700"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-green-900 text-cream px-6 py-3 hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {loading ? "..." : "Log In"}
          </button>
        </form>

        <p className="text-sm text-ink/60 mt-6">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-green-700 underline">
            Sign up
          </a>
        </p>
      </main>
    </>
  );
}
