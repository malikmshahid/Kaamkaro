"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setResetLink(`${window.location.origin}/reset-password?token=${data.resetToken}`);
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
          Forgot Your Password?
        </h1>
        <p className="text-ink/60 mb-8">
          Enter the phone number on your account and we&apos;ll get you a reset link.
        </p>

        {!resetLink ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Phone Number</label>
              <input
                className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
                placeholder="03XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
              {loading ? "..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-gold-500 bg-gold-100/50 rounded-xl p-5">
              <p className="font-semibold text-heading mb-2">
                Here&apos;s your reset link
              </p>
              <p className="text-xs text-ink/60 mb-3">
                SMS delivery isn&apos;t set up yet, so for now the link is shown
                directly here instead of being texted to you.
              </p>
              <a
                href={resetLink}
                className="block bg-card border border-line rounded-lg px-4 py-3 text-sm break-all text-green-700 underline"
              >
                {resetLink}
              </a>
            </div>
            <button
              onClick={() => router.push(resetLink.replace(window.location.origin, ""))}
              className="w-full rounded-full bg-green-900 text-cream px-6 py-3 hover:bg-green-800 transition-colors"
            >
              Continue to Reset Password
            </button>
          </div>
        )}

        <p className="text-sm text-ink/60 mt-6">
          Remembered it after all?{" "}
          <a href="/login" className="text-green-700 underline">
            Log in
          </a>
        </p>
      </main>
    </>
  );
}
