"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not verify code");
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

  async function handleResend() {
    setResending(true);
    setResendMessage("");
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not resend code");
        return;
      }
      setResendMessage("A new code has been sent to your email.");
    } catch {
      setError("Could not connect to the server");
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-md mx-auto w-full px-6 py-16">
        <h1 className="font-display text-3xl text-heading mb-2">
          Verify Your Email
        </h1>
        <p className="text-ink/60 mb-8">
          We sent a 6-digit code to your email address. Enter it below to
          finish creating your account.
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            className="w-full border border-line rounded-lg px-4 py-2.5 bg-card focus:outline-none focus:ring-2 focus:ring-green-700"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-green-900 text-cream px-6 py-2.5 hover:bg-green-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify & Continue"}
          </button>
        </form>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
        {resendMessage && (
          <p className="text-sm text-green-700 mt-3">{resendMessage}</p>
        )}

        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm text-ink/60 underline mt-6 disabled:opacity-50"
        >
          {resending ? "Sending..." : "Resend code"}
        </button>
      </main>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
