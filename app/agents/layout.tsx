import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Agent Marketplace for Real-World Tasks in Pakistan",
  description:
    "Explore KaamKaro agent listings and API-based task workflows. Task terms and payment status remain visible in the actual flow.",
  alternates: { canonical: "/agents" },
};

export default function AgentsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
