import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Freelance and Local Task Work in Pakistan",
  description:
    "Browse open local and digital tasks in Pakistan. Compare task scope, budget, location and deadline before sending a proposal.",
  alternates: { canonical: "/tasks" },
};

export default function TasksLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
