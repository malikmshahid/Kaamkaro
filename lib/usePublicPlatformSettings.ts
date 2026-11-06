"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/constants";
import { CURRENCIES } from "@/lib/currency";

export type PublicCategory = { value: string; label: string };
export type PublicPlatformSettings = {
  siteContent: {
    heroEyebrow: string;
    heroLineOne: string;
    heroAccent: string;
    heroLineTwo: string;
    heroSubheading: string;
    primaryCta: string;
    secondaryCta: string;
    supportEmail: string;
  };
  aiFeatures: {
    taskCopilotEnabled: boolean;
    proposalCopilotEnabled: boolean;
    proofAssistEnabled: boolean;
  };
  marketplace: {
    minTaskBudget: number;
    maxTaskBudget: number;
    minTaskLifetimeHours: number;
    maxTaskLifetimeDays: number;
    defaultCurrency: string;
    enabledCategories: string[];
  };
  categories: PublicCategory[];
  categoryLabels: Record<string, string>;
  currencies: typeof CURRENCIES;
};

const FALLBACK: PublicPlatformSettings = {
  siteContent: {
    heroEyebrow: "Clear scope · work worldwide",
    heroLineOne: "Work starts here.",
    heroAccent: "Anywhere",
    heroLineTwo: "with clarity.",
    heroSubheading: "A marketplace for local and digital work. Share what you need, compare proposals and review deliverables against a clear brief. Optional AI assists; people stay in control.",
    primaryCta: "Post a task — free",
    secondaryCta: "Browse open tasks",
    supportEmail: "support@kaamkaro.ai",
  },
  aiFeatures: { taskCopilotEnabled: true, proposalCopilotEnabled: true, proofAssistEnabled: true },
  marketplace: {
    minTaskBudget: 100,
    maxTaskBudget: 5_000_000,
    minTaskLifetimeHours: 1,
    maxTaskLifetimeDays: 90,
    defaultCurrency: "PKR",
    enabledCategories: CATEGORIES.map((c) => c.value),
  },
  categories: CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
  categoryLabels: Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label])),
  currencies: CURRENCIES,
};

/**
 * Public, non-secret settings. If the network is unavailable the forms fall
 * back to the same safe defaults that the server enforces.
 */
export function usePublicPlatformSettings() {
  const [settings, setSettings] = useState(FALLBACK);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/public/settings", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((value) => {
        if (!value?.marketplace || !Array.isArray(value.categories)) return;
        setSettings({
          ...FALLBACK,
          ...value,
          siteContent: { ...FALLBACK.siteContent, ...value.siteContent },
          marketplace: { ...FALLBACK.marketplace, ...value.marketplace },
          aiFeatures: { ...FALLBACK.aiFeatures, ...value.aiFeatures },
          categories: value.categories,
          categoryLabels: { ...FALLBACK.categoryLabels, ...(value.categoryLabels || {}) },
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return settings;
}
