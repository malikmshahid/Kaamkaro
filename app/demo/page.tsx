import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import DemoRoom from "./DemoRoom";

export const metadata: Metadata = {
  title: "Interactive demo | KaamKaro",
  description: "Explore a sample KaamKaro task from clear scope to proof review and work receipt. No account, real profiles, or payment involved.",
};

export default function DemoPage() {
  return (
    <>
      <Navbar />
      <DemoRoom />
    </>
  );
}
