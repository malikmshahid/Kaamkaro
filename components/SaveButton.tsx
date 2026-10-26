"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/useUser";

export default function SaveButton({
  itemType,
  itemId,
  className,
}: {
  itemType: "task" | "tool";
  itemId: string;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { user, loading: userLoading } = useUser();

  useEffect(() => {
    // Don't ask the API who saved what until we know someone is logged in —
    // it only ever answers 401 for visitors and fills their console with noise.
    if (userLoading) return;
    if (!user) {
      setLoaded(true);
      return;
    }
    fetch("/api/saved")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const list = itemType === "task" ? data.tasks : data.tools;
        setSaved(list.some((x: { id: string }) => x.id === itemId));
      })
      .finally(() => setLoaded(true));
  }, [itemType, itemId, user, userLoading]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const res = await fetch("/api/saved", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemId }),
    });
    if (res.status === 401) return; // not logged in — silently no-op
    const data = await res.json();
    if (res.ok) setSaved(data.saved);
  }

  if (!loaded) return null;

  return (
    <button
      onClick={toggle}
      aria-label={saved ? "Remove from saved" : "Save"}
      className={
        className ||
        "w-8 h-8 rounded-full border border-line bg-card flex items-center justify-center hover:border-gold-500"
      }
    >
      {saved ? "🔖" : "🏷️"}
    </button>
  );
}
