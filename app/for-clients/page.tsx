import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Hire Local Service Providers in Pakistan",
  description:
    "Post a local or digital task in Pakistan, compare provider proposals, or browse ready-made services. Set clear deliverables and review work yourself.",
  alternates: { canonical: "/for-clients" },
  openGraph: {
    title: "Hire Local Service Providers in Pakistan | KaamKaro",
    description:
      "A practical way to scope local work, compare provider proposals and review deliverables on KaamKaro.",
    url: "/for-clients",
  },
};

const faqs = [
  {
    question: "What is KaamKaro?",
    answer:
      "KaamKaro is a Pakistan-focused online marketplace where clients can post local or digital tasks, compare provider proposals, and browse ready-made services.",
  },
  {
    question: "How do I hire a provider in Pakistan?",
    answer:
      "Describe the outcome, list deliverables and timing, set a budget, then review proposals or browse a ready-made service. Agree the terms before work starts and review the submitted work yourself.",
  },
  {
    question: "Is it free to post a task?",
    answer:
      "Posting a task is free by default. Any applicable fee and payment terms are shown in the actual task flow before you commit.",
  },
  {
    question: "Does AI choose the provider or approve the work?",
    answer:
      "No. Optional AI assistance can help clarify a brief or surface review signals. The client chooses a provider and makes the final review decision.",
  },
  {
    question: "How are payments handled?",
    answer:
      "Payment methods and status depend on the options enabled for the specific task. Check the task's displayed terms and required payment status before work begins.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

export default function ForClientsPage() {
  return (
    <>
      <Navbar />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
      />
      <main className="flex-1">
        <section className="aurora grain border-b border-line">
          <div className="mx-auto max-w-5xl px-5 py-14 sm:px-6 sm:py-20">
            <nav aria-label="Breadcrumb" className="text-xs text-ink/50">
              <Link href="/" className="hover:text-green-800">Home</Link> <span aria-hidden="true">/</span> For clients
            </nav>
            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[.2em] text-gold-600">For clients · Pakistan</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-heading sm:text-6xl">
              Hire local providers in Pakistan—with a clear brief.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/65 sm:text-lg">
              KaamKaro is a task and service marketplace for local and digital work. Describe the outcome, compare provider proposals or browse a ready-made service, then review the agreed deliverables yourself.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/tasks/new" className="rounded-full bg-green-900 px-6 py-3 text-sm font-semibold text-cream hover:bg-green-800">Post a task — free</Link>
              <Link href="/tools" className="rounded-full border border-line bg-card px-6 py-3 text-sm font-semibold text-heading hover:border-green-800/40">Browse ready-made services</Link>
              <Link href="/demo" className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-heading hover:border-green-800/40">Watch the sample demo</Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl text-heading">How to hire through KaamKaro</h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/60">A good marketplace brief gives both sides the same definition of finished work. Use these steps for a local service, a remote digital task or a one-off business job.</p>
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["1", "Describe the result", "Write what you need done, where it needs to happen, and who or what the work is for. A task title should name the outcome, not only the activity."],
              ["2", "List deliverables", "Name the files, actions, photos, edits or other evidence you expect. KaamKaro tasks can include an optional checklist of up to six deliverables."],
              ["3", "Set budget and timing", "Choose a budget and deadline that fit the work. Review the displayed currency, task duration and payment terms before publishing or accepting a proposal."],
              ["4", "Compare proposals or services", "Review provider experience, quoted price, delivery estimate and the scope each person is offering. Ask for clarification before you accept."],
              ["5", "Review the submitted work", "Compare the actual files or evidence with the agreed brief. Optional AI signals can assist, but you decide whether to confirm, request a revision or use the available dispute process."],
            ].map(([n, title, body]) => (
              <li key={n} className="card-lux rounded-2xl p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-900 text-sm font-bold text-cream">{n}</span>
                <h3 className="mt-3 font-display text-xl text-heading">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl border border-gold-500/25 bg-gold-500/5 p-5">
            <h2 className="font-display text-xl text-heading">Before work starts</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">Read the exact payment and delivery terms shown for your task. Enabled payment methods and payment status can vary; only proceed once the task shows the required status. AI recommendations are advisory, not guarantees of quality or outcome.</p>
          </div>
        </section>

        <section className="border-y border-line bg-surface-2/35">
          <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
            <h2 className="font-display text-3xl text-heading">Questions clients ask</h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {faqs.map((faq) => (
                <details key={faq.question} className="py-4">
                  <summary className="cursor-pointer font-semibold text-heading">{faq.question}</summary>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/60">{faq.answer}</p>
                </details>
              ))}
            </div>
            <p className="mt-7 text-xs text-ink/45">KaamKaro is a marketplace; providers perform the work. Payment availability and terms are shown in each applicable task flow.</p>
          </div>
        </section>
      </main>
      <footer className="border-t border-line px-5 py-6 text-center text-xs text-ink/45">
        <Link href="/for-providers" className="hover:text-green-800">Looking for work? See the provider guide.</Link> · <Link href="/terms" className="hover:text-green-800">Terms</Link> · <Link href="/privacy" className="hover:text-green-800">Privacy</Link>
      </footer>
    </>
  );
}
