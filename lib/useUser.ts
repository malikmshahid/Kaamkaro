"use client";

import { useEffect, useState } from "react";

export type SafeUser = {
  id: string;
  name: string;
  phone: string;
  role: "client" | "provider" | "both" | "admin";
  city: string | null;
  cnicVerified: boolean;
  bio: string | null;
  skills: string | null;
  hourlyRate: number | null;
  ratingAvg: number;
  ratingCount: number;
};

export function useUser() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, setUser };
}
