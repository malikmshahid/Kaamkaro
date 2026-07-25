"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar() {
  const { user, loading, setUser } = useUser();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-paper/95 backdrop-blur sticky top-0 z-40">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-semibold text-heading">
            KaamKaro
          </span>
          <span className="text-xs uppercase tracking-wider text-gold-500">
            .ai
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <ThemeToggle />
          <Link href="/tasks" className="hover:text-green-700">
            Find Work
          </Link>
          <Link href="/tools" className="hover:text-green-700">
            The Toolbox
          </Link>
          {!loading && user && (
            <Link href="/tasks/new" className="hover:text-green-700">
              Post a Task
            </Link>
          )}
          {!loading && user && (
            <Link href="/dashboard" className="hover:text-green-700">
              Dashboard
            </Link>
          )}
          {!loading && user && (
            <Link href="/settings" className="hover:text-green-700">
              API Keys
            </Link>
          )}
          {!loading && user && user.role === "admin" && (
            <Link href="/admin" className="hover:text-gold-500 font-semibold">
              Admin
            </Link>
          )}

          {!loading && !user && (
            <>
              <Link href="/login" className="hover:text-green-700">
                Log In
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-green-900 text-cream px-4 py-2 hover:bg-green-800 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}

          {!loading && user && (
            <button
              onClick={handleLogout}
              className="rounded-full border border-green-900 px-4 py-2 hover:bg-green-900 hover:text-cream transition-colors"
            >
              Log Out
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
