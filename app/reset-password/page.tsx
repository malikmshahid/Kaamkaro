"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import PasswordInput from "@/components/PasswordInput";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch {
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-ink/60">
        This reset link looks incomplete. Please request a new one from the{" "}
        <a href="/forgot-password" className="text-green-700 underline">
          forgot password
        </a>{" "}
        page.
      </p>
    );
  }

  if (done) {
    return (
      <p className="text-green-700">
        Password updated! Taking you to the login page... ✅
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm mb-1">New Password</label>
        <PasswordInput
          value={password}
          onChange={setPassword}
          minLength={6}
          required
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="block text-sm mb-1">Confirm New Password</label>
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          minLength={6}
          required
          autoComplete="new-password"
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
        {loading ? "..." : "Update Password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-md mx-auto w-full px-6 py-16">
        <h1 className="font-display text-3xl text-heading mb-2">
          Set a New Password
        </h1>
        <p className="text-ink/60 mb-8">Choose something you&apos;ll remember this time.</p>
        <Suspense fallback={<p className="text-ink/50">Loading...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </main>
    </>
  );
}
