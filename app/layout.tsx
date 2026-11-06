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
    default: "Local and Digital Work Marketplace | SafarWorks",
    template: "%s | SafarWorks",
  },
  description:
    "Post local or digital work, compare provider proposals, and browse ready-made services. Currency and payment options vary by task and region.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SafarWorks",
    url: siteUrl,
    title: "SafarWorks — Local and Digital Work",
    description:
      "Connect with providers, post local or digital tasks, and browse ready-made services. Clear deliverables, optional AI assistance and human review.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SafarWorks — marketplace for local and digital work" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "SafarWorks — Local and Digital Work",
    description: "Post work, compare proposals, or browse ready-made services. Payment options vary by task and region.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-video-preview": -1, "max-snippet": -1 },
  },
  manifest: "/manifest.webmanifest",
  applicationName: "SafarWorks",
  appleWebApp: { capable: true, title: "SafarWorks", statusBarStyle: "default" },
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
      name: "SafarWorks",
      url: siteUrl,
      logo: `${siteUrl}/icon-512.png`,
      description:
        "A marketplace connecting clients and providers for local and digital work, with optional AI assistance and human-led review.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "SafarWorks",
      inLanguage: ["en", "ur"],
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
      lang="en"
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
