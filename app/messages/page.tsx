import Navbar from "@/components/Navbar";
import MessagesInterface from "@/components/MessagesInterface";

export default function MessagesPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">Stay connected</p>
            <h1 className="font-display text-3xl text-heading sm:text-4xl">Messages</h1>
            <p className="mt-2 max-w-xl text-sm text-ink/60">Keep project details, updates, and next steps close at hand.</p>
          </div>
        </div>
        <MessagesInterface />
      </main>
    </>
  );
}
