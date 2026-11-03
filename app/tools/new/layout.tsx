import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "List a Service on KaamKaro",
  description: "Create a clear, fixed-scope service listing for clients to discover.",
  alternates: { canonical: "/tools/new" },
  robots: { index: false, follow: true },
};

export default function NewToolLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
