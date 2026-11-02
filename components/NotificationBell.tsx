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
  const hasLoadedRef = useRef(false);
  const loadingRef = useRef<Promise<number | null> | null>(null);
  const lastLoadedAtRef = useRef(0);

  function load(): Promise<number | null> {
    if (loadingRef.current) return loadingRef.current;
    const request = (async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return null;
        const data = await res.json();
        const count = Number(data.unreadCount) || 0;
        setItems(data.notifications || []);
        setUnreadCount(count);
        hasLoadedRef.current = true;
        lastLoadedAtRef.current = Date.now();
        return count;
      } catch {
        return null;
      } finally {
        loadingRef.current = null;
      }
    })();
    loadingRef.current = request;
    return request;
  }

  useEffect(() => {
    let idleHandle: number | undefined;
    let fallbackTimer: number | undefined;
    const startLowPriorityLoad = () => {
      if (document.visibilityState === "visible") void load();
    };
    const onVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastLoadedAtRef.current > 30_000
      ) {
        void load();
      }
    };

    // Keep notification traffic out of the page's critical first paint.
    const idleWindow = window as unknown as {
      requestIdleCallback?: (callback: () => void, options: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(startLowPriorityLoad, { timeout: 2000 });
    } else {
      fallbackTimer = window.setTimeout(startLowPriorityLoad, 900);
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleOpen() {
    const opening = !open;
    setOpen(opening);
    if (!opening) return;

    const count = hasLoadedRef.current ? unreadCount : (await load()) ?? 0;
    if (count > 0) {
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
