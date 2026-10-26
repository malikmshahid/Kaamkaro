import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://kaamkaro.ai";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "KaamKaro — Pakistan ka Apna Marketplace",
    template: "%s · KaamKaro",
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
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
