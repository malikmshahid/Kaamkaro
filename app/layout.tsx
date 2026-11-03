import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";

// Display serif: high-contrast, slightly "soft" — the premium voice of the brand.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

// Body: neutral, dense, screen-first.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro-six.vercel.app").replace(/\/$/, "");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // lets the bottom nav sit behind the iOS home indicator safely
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f5ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1109" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Task & Service Marketplace in Pakistan | KaamKaro",
    template: "%s | KaamKaro",
  },
  description:
    "Post a local or digital task in Pakistan, compare provider proposals, or browse ready-made services. PKR-first, with optional AI assistance and human-led review.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_PK",
    siteName: "KaamKaro",
    url: siteUrl,
    title: "KaamKaro — Pakistan Task & Service Marketplace",
    description:
      "Post a task, compare provider proposals or browse ready-made services in Pakistan. Clear deliverables, optional AI assistance and human review.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "KaamKaro — task and service marketplace in Pakistan" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KaamKaro — Pakistan Task & Service Marketplace",
    description: "Post a task, compare proposals or browse ready-made services in Pakistan.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1, "max-snippet": -1 },
  },
  manifest: "/manifest.webmanifest",
  applicationName: "KaamKaro",
  appleWebApp: { capable: true, title: "KaamKaro", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

/** Accurate organization and website entity metadata shared across public pages. */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "KaamKaro",
      url: siteUrl,
      logo: `${siteUrl}/icon-512.png`,
      description:
        "A Pakistan-focused online marketplace where clients can post local or digital tasks, compare provider proposals, and browse ready-made services.",
      areaServed: { "@type": "Country", name: "Pakistan" },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "KaamKaro",
      inLanguage: ["en-PK", "ur-PK"],
      publisher: { "@id": `${siteUrl}/#organization` },
    },
  ],
};

// Runs before paint so the page never flashes the wrong theme on load.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('kaamkaro-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored ? stored === 'dark' : prefersDark;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-PK"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
