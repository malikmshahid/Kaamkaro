"use client";

import { useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled UI error:", error);
  }, [error]);

  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-gold-500 font-display text-6xl mb-4">⚠️</p>
        <h1 className="font-display text-3xl text-heading mb-3">
          Something broke on our end
        </h1>
        <p className="text-ink/60 max-w-md mb-8">
          This wasn&apos;t your fault — an unexpected error happened. Try again,
          or head back home.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={reset}
            className="rounded-full bg-green-900 text-cream px-6 py-3 hover:bg-green-800 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="rounded-full border border-green-900 px-6 py-3 hover:bg-green-900 hover:text-cream transition-colors"
          >
            Go Home
          </Link>
        </div>
      </main>
    </>
  );
}
