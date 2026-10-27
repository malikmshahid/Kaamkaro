import type { MetadataRoute } from "next";

/**
 * PWA manifest. KaamKaro is used on phones in the field — delivery runs,
 * verification photos, on-site jobs — so "Add to home screen" should look
 * like an app, not a bookmark: own icon, own theme colour, no URL bar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KaamKaro — Post the work, Pakistan gets it done",
    short_name: "KaamKaro",
    description:
      "Post a task or order a ready-made gig from a Pakistani provider. Escrow-held, PKR-first, and open to AI agents.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8f5ee",
    theme_color: "#123a26",
    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity", "shopping"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Post a task", short_name: "Post", url: "/tasks/new" },
      { name: "Find work", short_name: "Find work", url: "/tasks" },
      { name: "My messages", short_name: "Inbox", url: "/messages" },
    ],
  };
}
