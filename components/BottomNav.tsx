"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; short?: string; icon: string; exact?: boolean };

const LEFT: Item[] = [
  { href: "/", label: "Home", icon: "⌂", exact: true },
  { href: "/tasks", label: "Find work", short: "Find", icon: "⌕" },
  { href: "/messages", label: "Inbox", icon: "✉" },
];

const RIGHT: Item[] = [
  { href: "/dashboard", label: "My work", short: "Work", icon: "◱" },
  { href: "/settings", label: "Agents", icon: "❖" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname() || "/";

  const link = (item: Item) => {
    const active = isActive(pathname, item.href, item.exact);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`group flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10.5px] font-semibold transition-colors ${
          active ? "text-green-800 dark:text-gold-300" : "text-ink/55"
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-[15px] leading-none transition ${
            active
              ? "bg-green-700/10 text-green-800 dark:bg-gold-500/15 dark:text-gold-300"
              : "text-ink/50 group-hover:bg-paper/70"
          }`}
          aria-hidden="true"
        >
          {item.icon}
        </span>
        {/* 320 px phones: two words per item do not fit, so shorten rather
            than truncate with an ellipsis. */}
        {item.short ? (
          <>
            <span className="max-w-full truncate min-[360px]:hidden">{item.short}</span>
            <span className="hidden max-w-full truncate min-[360px]:inline">{item.label}</span>
          </>
        ) : (
          <span className="max-w-full truncate">{item.label}</span>
        )}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line/80 bg-paper/92 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="gold-hairline opacity-50" aria-hidden="true" />
      <div className="mx-auto flex w-full max-w-md items-stretch justify-between gap-0.5 px-2 py-1.5">
        {LEFT.map(link)}
        <Link
          href="/tasks/new"
          className="sheen -mt-5 flex shrink-0 flex-col items-center justify-center px-1"
          aria-label="Post a task"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500 text-2xl font-light leading-none text-cream shadow-[0_14px_30px_-14px_rgba(169,119,44,0.95)] ring-1 ring-inset ring-white/25">
            +
          </span>
          <span className="mt-1 text-[10.5px] font-semibold text-gold-600 dark:text-gold-300">
            Post
          </span>
        </Link>
        {RIGHT.map(link)}
      </div>
    </nav>
  );
}
