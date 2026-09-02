"use client";

import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      // ✅ Only ever show the generic message.
      // ❌ Never read/store/display data.resetToken, data.resetLink, data.token, etc.
      setMessage(data.message ?? "If this account is registered, a reset link has been sent.");
    } catch (err) {
      console.error(err);
      setMessage("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
      setEmail("");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6">
      <h1 className="text-xl font-semibold mb-4">Forgot Password</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white rounded-md py-2 disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      {message && (
        <p className="mt-4 text-sm text-gray-700" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
