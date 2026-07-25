"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    city: "",
    role: "both" as "client" | "provider" | "both",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
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
        <h1 className="font-display text-3xl text-heading mb-2">
          Create Your Account
        </h1>
        <p className="text-ink/60 mb-8">
          One account, whether you&apos;re here to give work or get it done.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Full Name</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Phone Number</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="03XXXXXXXXX"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">City</label>
            <input
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              placeholder="Lodhran, Lahore, Karachi..."
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">What brings you here?</label>
            <select
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={form.role}
              onChange={(e) =>
                setForm({ ...form, role: e.target.value as typeof form.role })
              }
            >
              <option value="both">Both &mdash; give work and get it done</option>
              <option value="client">Just posting work</option>
              <option value="provider">Just here to earn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
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
            {loading ? "Creating your account..." : "Create Account"}
          </button>

          <p className="text-xs text-ink/50 text-center">
            By signing up, you agree to our{" "}
            <a href="/terms" className="underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </form>

        <p className="text-sm text-ink/60 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-green-700 underline">
            Log in
          </a>
        </p>
      </main>
    </>
  );
}
