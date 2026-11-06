import type { MetadataRoute } from "next";

/**
 * PWA manifest. SafarWorks is used on phones in the field — delivery runs,
 * verification photos, on-site jobs — so "Add to home screen" should look
 * like an app, not a bookmark: own icon, own theme colour, no URL bar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SafarWorks — Clear work, better outcomes",
    short_name: "SafarWorks",
    description:
      "Post local or digital work, compare proposals, and review deliverables. Currency and payment options depend on your task and region.",
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
