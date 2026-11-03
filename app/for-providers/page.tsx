import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Find Freelance and Local Task Work in Pakistan",
  description:
    "Browse local and digital work in Pakistan, send a proposal with your own quote and delivery estimate, and submit work against clear deliverables.",
  alternates: { canonical: "/for-providers" },
  openGraph: {
    title: "Find Work in Pakistan | KaamKaro Provider Guide",
    description:
      "A practical guide to browsing tasks, writing proposals and setting clear delivery terms on KaamKaro.",
    url: "/for-providers",
  },
};

const faqs = [
  {
    question: "What is KaamKaro for providers?",
    answer:
      "KaamKaro is a Pakistan-focused marketplace where providers can browse local and digital tasks, send proposals, or list ready-made services for clients to order.",
  },
  {
    question: "Can I set my own price and delivery time?",
    answer:
      "For open tasks, a provider can include a proposed price and delivery estimate. Make sure your quote covers the agreed scope, revisions and timing.",
  },
  {
    question: "Do I have to pay to apply?",
    answer:
      "KaamKaro's public product information says there are no paid connects and no fee to apply. Check the current terms shown in your account and task flow.",
  },
  {
    question: "Can AI write my proposal?",
    answer:
      "Optional AI assistance can draft a proposal using your profile and the task details. Review and edit every claim so it accurately represents your skills and experience.",
  },
  {
    question: "When should I start work?",
    answer:
      "Start only after the client has accepted your proposal, the scope is clear, and the task shows any required payment status. Payment and payout methods depend on the specific task and enabled options.",
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

export default function ForProvidersPage() {
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
              <Link href="/" className="hover:text-green-800">Home</Link> <span aria-hidden="true">/</span> For providers
            </nav>
            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[.2em] text-gold-600">For providers · Pakistan</p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl leading-tight text-heading sm:text-6xl">
              Find freelance and local task work in Pakistan.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/65 sm:text-lg">
              Browse open tasks, decide which work fits your skills, and send a proposal with your own price and delivery estimate. You can also list a fixed-scope service for clients to discover.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/tasks" className="rounded-full bg-green-900 px-6 py-3 text-sm font-semibold text-cream hover:bg-green-800">Browse open work</Link>
              <Link href="/tools/new" className="rounded-full border border-line bg-card px-6 py-3 text-sm font-semibold text-heading hover:border-green-800/40">List a ready-made service</Link>
              <Link href="/demo" className="rounded-full border border-line px-6 py-3 text-sm font-semibold text-heading hover:border-green-800/40">See the sample flow</Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
          <h2 className="font-display text-3xl text-heading">How to use KaamKaro as a provider</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {[
              ["1", "Build an honest profile", "Describe the work you can do, your skills and relevant examples. Keep claims specific and verifiable."],
              ["2", "Browse tasks that fit", "Check category, location, budget, expiry, deliverables and any task terms before spending time on a proposal."],
              ["3", "Send a clear proposal", "State your price, estimated delivery time, approach and any assumptions. Optional AI drafting is editable—verify every sentence before sending."],
              ["4", "Agree scope before starting", "Confirm the deliverables, deadline, revisions and payment status with the client. Start only when the task shows any required funding status."],
              ["5", "Submit proof and communicate", "Upload the agreed files or evidence and describe what is included. Respond to review requests through the task conversation."],
            ].map(([n, title, body]) => (
              <li key={n} className="card-lux rounded-2xl p-5">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-900 text-sm font-bold text-cream">{n}</span>
                <h3 className="mt-3 font-display text-xl text-heading">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 rounded-2xl border border-gold-500/25 bg-gold-500/5 p-5">
            <h2 className="font-display text-xl text-heading">Payment and safety reminder</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/60">Payment and payout options can vary by task. Read the exact terms in KaamKaro, do not rely on a screenshot or off-platform promise, and do not begin until any required payment status is confirmed in the task.</p>
          </div>
        </section>

        <section className="border-y border-line bg-surface-2/35">
          <div className="mx-auto max-w-4xl px-5 py-12 sm:px-6 sm:py-16">
            <h2 className="font-display text-3xl text-heading">Questions providers ask</h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {faqs.map((faq) => (
                <details key={faq.question} className="py-4">
                  <summary className="cursor-pointer font-semibold text-heading">{faq.question}</summary>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink/60">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line px-5 py-6 text-center text-xs text-ink/45">
        <Link href="/for-clients" className="hover:text-green-800">Need to hire? Read the client guide.</Link> · <Link href="/terms" className="hover:text-green-800">Terms</Link> · <Link href="/privacy" className="hover:text-green-800">Privacy</Link>
      </footer>
    </>
  );
}
