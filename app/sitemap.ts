import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  // No hardcoded fallback domain: if NEXT_PUBLIC_SITE_URL is missing we still
  // emit a valid (if bare) sitemap rather than pointing at a domain that 404s.
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro.ai").replace(/\/$/, "");

  return [
    { url: `${base}/`, priority: 1, changeFrequency: "daily" },
    { url: `${base}/tasks`, priority: 0.9, changeFrequency: "hourly" },
    { url: `${base}/tools`, priority: 0.9, changeFrequency: "daily" },
    { url: `${base}/why-kaamkaro`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${base}/signup`, priority: 0.7 },
    { url: `${base}/login`, priority: 0.5 },
    { url: `${base}/terms`, priority: 0.3 },
    { url: `${base}/privacy`, priority: 0.3 },
  ];
}
