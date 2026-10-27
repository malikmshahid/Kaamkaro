import Navbar from "@/components/Navbar";
import MessagesInterface from "@/components/MessagesInterface";

export const metadata = {
  title: "Messages · KaamKaro",
  description: "Every task chat, update and decision in one thread — with escrow context beside it.",
};

export default function MessagesPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-7 pt-10 sm:px-6 sm:pb-9 sm:pt-14">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="reveal inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
                  <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
                  Inbox · per-task threads
                </p>
                <h1 className="reveal reveal-1 mt-4 font-display text-[1.9rem] font-medium leading-[1.05] tracking-[-0.02em] text-heading sm:text-[2.7rem]">
                  Conversations that <span className="gold-text">hold up</span> later.
                </h1>
                <p className="reveal reveal-2 mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
                  One thread per job — the brief, the proof, the arguments. On an active job nothing
                  can be deleted, so a dispute is decided on what was actually said.
                </p>
              </div>
              <p className="reveal reveal-2 shrink-0 rounded-full border border-line bg-card/80 px-3.5 py-1.5 text-[11px] font-medium text-ink/60 shadow-lux-sm">
                Messages are kept as escrow evidence
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-9">
          <MessagesInterface />
        </section>
      </main>
    </>
  );
}
