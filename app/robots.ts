import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro.ai").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/tasks", "/tools", "/terms", "/privacy"],
        disallow: ["/api/", "/dashboard", "/settings", "/admin", "/messages"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
