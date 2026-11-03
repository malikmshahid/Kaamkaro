import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Post a Task in Pakistan",
  description: "Write a clear task brief and choose the budget and terms shown in the task flow.",
  alternates: { canonical: "/tasks/new" },
  robots: { index: false, follow: true },
};

export default function NewTaskLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
