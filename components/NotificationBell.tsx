"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";

type Notification = {
  id: string;
  type: string;
  message: string;
  taskId: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (unreadCount > 0) {
      await fetch("/api/notifications/read-all", { method: "POST" });
      setUnreadCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full border border-line flex items-center justify-center hover:border-green-700 transition-colors text-lg leading-none"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gold-500 text-cream text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-card border border-line rounded-xl shadow-lg z-50">
          <p className="text-xs uppercase tracking-wide text-ink/50 px-4 pt-3 pb-2">
            Notifications
          </p>
          {items.length === 0 && (
            <p className="text-sm text-ink/50 px-4 pb-4">You&apos;re all caught up. ✨</p>
          )}
          <div className="divide-y divide-line">
            {items.map((n) => (
              <Link
                key={n.id}
                href={n.taskId ? `/tasks/${n.taskId}` : "#"}
                onClick={() => setOpen(false)}
                className={`block px-4 py-3 text-sm hover:bg-paper transition-colors ${
                  !n.read ? "bg-gold-100/30" : ""
                }`}
              >
                {n.message}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
