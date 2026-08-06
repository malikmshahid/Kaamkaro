"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";

export default function Navbar() {
  const { user, loading, setUser } = useUser();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  const navLinks = (
    <>
      <Link href="/tasks" onClick={() => setMenuOpen(false)} className="hover:text-green-700">
        Find Work
      </Link>
      <Link href="/tools" onClick={() => setMenuOpen(false)} className="hover:text-green-700">
        The Toolbox
      </Link>
      {!loading && user && (
        <Link href="/tasks/new" onClick={() => setMenuOpen(false)} className="hover:text-green-700">
          Post a Task
        </Link>
      )}
      {!loading && user && (
        <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="hover:text-green-700">
          Dashboard
        </Link>
      )}
      {!loading && user && (
        <Link href="/settings" onClick={() => setMenuOpen(false)} className="hover:text-green-700">
          API Keys
        </Link>
      )}
      {!loading && user && user.role === "admin" && (
        <Link
          href="/admin"
          onClick={() => setMenuOpen(false)}
          className="hover:text-gold-500 font-semibold"
        >
          Admin
        </Link>
      )}
    </>
  );

  const authControls = (
    <>
      {!loading && !user && (
        <>
          <Link href="/login" onClick={() => setMenuOpen(false)} className="hover:text-green-700">
            Log In
          </Link>
          <Link
            href="/signup"
            onClick={() => setMenuOpen(false)}
            className="rounded-full bg-green-900 text-cream px-4 py-2 text-center hover:bg-green-800 transition-colors"
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
    </>
  );

  return (
    <header className="border-b border-line bg-paper/95 backdrop-blur sticky top-0 z-40">
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2" onClick={() => setMenuOpen(false)}>
          <span className="font-display text-2xl font-semibold text-heading">
            KaamKaro
          </span>
          <span className="text-xs uppercase tracking-wider text-gold-500">
            .ai
          </span>
        </Link>

        {/* Desktop nav — hidden below md breakpoint */}
        <div className="hidden md:flex items-center gap-6 text-sm">
          <ThemeToggle />
          {!loading && user && <NotificationBell />}
          {navLinks}
          {authControls}
        </div>

        {/* Mobile controls: theme + bell always visible, rest behind hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <ThemeToggle />
          {!loading && user && <NotificationBell />}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-lg leading-none"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div className="md:hidden border-t border-line bg-paper px-4 py-4 flex flex-col gap-4 text-sm">
          {navLinks}
          <div className="flex flex-col gap-3 pt-2 border-t border-line">{authControls}</div>
        </div>
      )}
    </header>
  );
}
