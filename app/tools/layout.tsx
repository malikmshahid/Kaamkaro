import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ready-Made Services from Providers in Pakistan",
  description:
    "Browse fixed-scope services from providers in Pakistan. Compare what is included, price, delivery time and task terms before ordering.",
  alternates: { canonical: "/tools" },
};

export default function ToolsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
