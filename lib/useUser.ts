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

let inFlightUserRequest: Promise<SafeUser | null> | null = null;

function fetchCurrentUser(): Promise<SafeUser | null> {
  if (!inFlightUserRequest) {
    inFlightUserRequest = fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => (data?.user ?? null) as SafeUser | null)
      .catch(() => null)
      .finally(() => {
        inFlightUserRequest = null;
      });
  }
  return inFlightUserRequest;
}

export function useUser() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, setUser };
}
