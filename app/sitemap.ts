import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro.ai";

  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/tasks`, priority: 0.9 },
    { url: `${base}/tools`, priority: 0.9 },
    { url: `${base}/signup`, priority: 0.7 },
    { url: `${base}/login`, priority: 0.5 },
    { url: `${base}/terms`, priority: 0.3 },
    { url: `${base}/privacy`, priority: 0.3 },
  ];
}
