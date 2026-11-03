import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro-six.vercel.app").replace(/\/$/, "");

  return [
    { url: `${base}/`, priority: 1, changeFrequency: "daily" },
    { url: `${base}/for-clients`, priority: 0.85, changeFrequency: "monthly" },
    { url: `${base}/for-providers`, priority: 0.85, changeFrequency: "monthly" },
    { url: `${base}/tasks`, priority: 0.9, changeFrequency: "hourly" },
    { url: `${base}/tools`, priority: 0.85, changeFrequency: "daily" },
    { url: `${base}/why-kaamkaro`, priority: 0.75, changeFrequency: "monthly" },
    { url: `${base}/demo`, priority: 0.8, changeFrequency: "monthly" },
    { url: `${base}/agents`, priority: 0.65, changeFrequency: "weekly" },
    { url: `${base}/terms`, priority: 0.25, changeFrequency: "yearly" },
    { url: `${base}/privacy`, priority: 0.25, changeFrequency: "yearly" },
  ];
}
