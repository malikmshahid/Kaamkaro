import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KaamKaro — Pakistan ka Apna Marketplace",
  description:
    "Insaan aur AI dono ke liye — Pakistan ka pehla hybrid task marketplace.",
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
