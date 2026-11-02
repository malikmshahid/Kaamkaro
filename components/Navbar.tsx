"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/useUser";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import BottomNav from "@/components/BottomNav";

export default function Navbar() {
  const { user, loading, setUser } = useUser();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    setMoreOpen(false);
    router.push("/");
    router.refresh();
  }

  function closeMenus() {
    setMenuOpen(false);
    setMoreOpen(false);
  }

  const navLinks = (
    <>
      <Link href="/demo" onClick={closeMenus} className="font-semibold text-gold-700 hover:text-gold-500 dark:text-gold-300">
        Demo Room
      </Link>
      <Link href="/tasks" onClick={closeMenus} className="hover:text-green-700">
        Find Work
      </Link>
      <Link href="/tools" onClick={closeMenus} className="hover:text-green-700">
        The Toolbox
      </Link>
      {!loading && user && (
        <Link href="/tasks/new" onClick={closeMenus} className="hover:text-green-700">
          Post a Task
        </Link>
      )}
      {!loading && user && (
        <Link href="/dashboard" onClick={closeMenus} className="hover:text-green-700">
          Dashboard
        </Link>
      )}
      {!loading && user && (
        <Link href="/settings" onClick={closeMenus} className="hover:text-green-700">
          API Keys
        </Link>
      )}
      {!loading && user && (
        <Link href="/messages" onClick={closeMenus} className="hover:text-green-700">
          Messages
        </Link>
      )}
      {!loading && user && user.role === "admin" && (
        <Link href="/admin" onClick={closeMenus} className="font-semibold hover:text-gold-500">
          Admin
        </Link>
      )}
    </>
  );

  const authControls = (
    <>
      {!loading && !user && (
        <>
          <Link href="/login" onClick={closeMenus} className="whitespace-nowrap px-2 py-2 hover:text-green-700">
            Log In
          </Link>
          <Link
            href="/signup"
            onClick={closeMenus}
            className="whitespace-nowrap rounded-full bg-green-900 px-4 py-2.5 text-center font-semibold text-cream shadow-sm transition-colors hover:bg-green-800"
          >
            Get Started
          </Link>
        </>
      )}
      {!loading && user && (
        <button
          onClick={handleLogout}
          className="whitespace-nowrap rounded-full border border-line px-4 py-2.5 font-medium transition-colors hover:border-green-800 hover:bg-green-900 hover:text-cream"
        >
          Log Out
        </button>
      )}
    </>
  );

  const utilityLinks = (
    <div className="absolute right-0 top-full z-50 mt-3 w-52 rounded-2xl border border-line bg-paper p-2 text-sm shadow-xl shadow-black/10">
      <Link href="/dashboard" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 hover:bg-card hover:text-green-800">Dashboard</Link>
      <Link href="/settings" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 hover:bg-card hover:text-green-800">API Keys & Settings</Link>
      <Link href="/messages" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 hover:bg-card hover:text-green-800">Messages</Link>
      {user?.role === "admin" && <Link href="/admin" onClick={closeMenus} className="block rounded-xl px-3 py-2.5 font-semibold text-gold-700 hover:bg-card">Admin</Link>}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-xl">
        <div className="gold-hairline opacity-60" aria-hidden="true" />
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5" onClick={closeMenus}>
            <img src="/logo-mark.svg" alt="" width={34} height={34} className="rounded-lg" />
            <span className="whitespace-nowrap font-display text-xl font-semibold tracking-tight text-heading sm:text-2xl">
              KaamKaro
            </span>
          </Link>

          {/* Desktop navigation: keep the main destinations together and tuck
              account-specific links into one compact menu to prevent wrapping. */}
          <div className="hidden min-w-0 flex-1 items-center justify-end gap-2.5 text-[13px] xl:flex xl:gap-3">
            <div className="flex shrink-0 items-center rounded-full border border-line/80 bg-card/50 p-1 shadow-sm">
              <Link href="/demo" className="whitespace-nowrap rounded-full bg-gold-500/15 px-3 py-2 font-semibold text-gold-700 transition-colors hover:bg-gold-500/25 dark:text-gold-300">
                Demo Room
              </Link>
              <Link href="/tasks" className="whitespace-nowrap rounded-full px-3 py-2 font-medium text-ink/80 transition-colors hover:bg-paper hover:text-green-800">
                Find Work
              </Link>
              <Link href="/tools" className="whitespace-nowrap rounded-full px-3 py-2 font-medium text-ink/80 transition-colors hover:bg-paper hover:text-green-800">
                Toolbox
              </Link>
            </div>

            {!loading && user && (
              <Link href="/tasks/new" className="whitespace-nowrap rounded-full bg-green-900 px-4 py-2.5 font-semibold text-cream shadow-sm transition-all hover:-translate-y-0.5 hover:bg-green-800">
                Post a Task
              </Link>
            )}

            {!loading && user && (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMoreOpen((open) => !open)}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3.5 py-2.5 font-medium transition-colors hover:border-green-800 hover:bg-card"
                >
                  More <span aria-hidden="true" className={`text-[10px] transition-transform ${moreOpen ? "rotate-180" : ""}`}>▾</span>
                </button>
                {moreOpen && utilityLinks}
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              {!loading && user && <NotificationBell />}
            </div>
            <div className="flex shrink-0 items-center gap-2">{authControls}</div>
          </div>

          {/* Compact header controls on tablet/mobile; destinations live in the menu. */}
          <div className="flex shrink-0 items-center gap-2.5 xl:hidden">
            <ThemeToggle />
            {!loading && user && <NotificationBell />}
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-lg leading-none transition-colors hover:bg-card"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </nav>

        {/* Mobile/tablet dropdown */}
        {menuOpen && (
          <div className="xl:hidden border-t border-line bg-paper px-5 py-4 shadow-lg shadow-black/5">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 text-sm">
              {navLinks}
              <div className="mt-3 flex flex-col gap-1 border-t border-line pt-3">{authControls}</div>
            </div>
          </div>
        )}
      </header>
      {!loading && user && <BottomNav />}
    </>
  );
}
