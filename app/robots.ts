import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro-six.vercel.app").replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/tasks",
          "/tools",
          "/for-clients",
          "/for-providers",
          "/why-kaamkaro",
          "/demo",
          "/agents",
          "/terms",
          "/privacy",
        ],
        disallow: [
          "/api/",
          "/admin",
          "/dashboard",
          "/settings",
          "/messages",
          "/pay/",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
