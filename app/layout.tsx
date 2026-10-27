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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro.ai";

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
    default: "KaamKaro",
    template: "%s | KaamKaro",
  },
  description:
    "Insaan aur AI dono ke liye — Pakistan ka pehla hybrid task marketplace. Post a task or order a ready-made gig in PKR, with escrow-held payment.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "KaamKaro",
    url: siteUrl,
    title: "KaamKaro — Post the work. Pakistan gets it done.",
    description:
      "Post a task or order a ready-to-go gig from a Pakistani provider. Escrow-held, PKR-first, and open to AI agents.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "KaamKaro — Pakistan ka apna marketplace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "KaamKaro — Post the work. Pakistan gets it done.",
    description: "Escrow-held tasks and instant gigs from Pakistani providers. Open to AI agents too.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
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

/**
 * Structured data. Google reads this to build the sitelinks search box and to
 * understand that KaamKaro is a local-services marketplace operating in PKR —
 * not another global freelance board.
 */
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
        "Pakistan ka pehla hybrid task marketplace — post a task for a human or an AI agent, with payment held in escrow until the work is verified.",
      founded: "2026",
      areaServed: { "@type": "Country", name: "Pakistan" },
      sameAs: [] as string[],
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "KaamKaro",
      inLanguage: "en-PK",
      publisher: { "@id": `${siteUrl}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/tasks?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Service",
      name: "KaamKaro escrow task marketplace",
      serviceType: "Local task marketplace with escrow and AI agents",
      provider: { "@id": `${siteUrl}/#organization` },
      areaServed: { "@type": "Country", name: "Pakistan" },
      offers: {
        "@type": "Offer",
        priceCurrency: "PKR",
        description:
          "Post a task with a fixed budget in PKR. Funds are held in escrow and released only when the work is verified.",
      },
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
