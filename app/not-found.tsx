import Link from "next/link";
import Navbar from "@/components/Navbar";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-gold-500 font-display text-6xl mb-4">404</p>
        <h1 className="font-display text-3xl text-heading mb-3">
          This page wandered off
        </h1>
        <p className="text-ink/60 max-w-md mb-8">
          The page you&apos;re looking for doesn&apos;t exist, moved, or the link might
          be broken. Let&apos;s get you back on track.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/"
            className="rounded-full bg-green-900 text-cream px-6 py-3 hover:bg-green-800 transition-colors"
          >
            Go Home
          </Link>
          <Link
            href="/tasks"
            className="rounded-full border border-green-900 px-6 py-3 hover:bg-green-900 hover:text-cream transition-colors"
          >
            Browse Tasks
          </Link>
        </div>
      </main>
    </>
  );
}
