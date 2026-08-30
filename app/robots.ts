import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/tasks", "/tools", "/terms", "/privacy"],
        disallow: ["/api/", "/dashboard", "/settings", "/admin"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro.ai"}/sitemap.xml`,
  };
}
