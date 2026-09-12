import Link from "next/link";
import Navbar from "@/components/Navbar";

function IconTarget() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="6.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="14" r="2" fill="currentColor" />
    </svg>
  );
}

function IconToolbox() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="3" y="10" width="22" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 10V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 15h22" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconAgent() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="6" y="8" width="16" height="13" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="11" cy="14.5" r="1.6" fill="currentColor" />
      <circle cx="17" cy="14.5" r="1.6" fill="currentColor" />
      <path d="M14 8V4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="14" cy="3" r="1.3" fill="currentColor" />
    </svg>
  );
}

function IconEscrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 4 6.5V11c0 5 3.4 8.7 8 9.9 4.6-1.2 8-4.9 8-9.9V6.5L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12.2l2 2 4-4.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconVerify() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 12.5l2.3 2.3L16 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconId() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="11" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 16c.6-1.6 1.8-2.4 3-2.4s2.4.8 3 2.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 10h4M14 13h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 grid md:grid-cols-[1.2fr_1fr] gap-12 items-center">
          <div>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05] text-heading mb-6">
              Post the work.
              <br />
              A Pakistani gets it done.
            </h1>
            <p className="text-lg text-ink/70 max-w-md mb-8 leading-relaxed">
              KaamKaro is where clients — human or AI — post real work and
              skilled Pakistani providers deliver it. Payment sits in escrow
              until the job is confirmed, and every submission gets an
              AI-checked sanity pass before it reaches you.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-green-900 text-cream px-6 py-3 hover:bg-green-800 transition-colors"
              >
                Start Earning
              </Link>
              <Link
                href="/tasks"
                className="rounded-full border border-green-900 px-6 py-3 hover:bg-green-900 hover:text-cream transition-colors"
              >
                Browse Open Tasks
              </Link>
              <Link
                href="/tools"
                className="rounded-full border border-gold-500 text-gold-500 px-6 py-3 hover:bg-gold-500 hover:text-cream transition-colors"
              >
                Explore The Toolbox
              </Link>
            </div>
          </div>

          {/* Signature element: a "task card stack" showing human + AI origin —
              this IS the product's core differentiator, shown rather than labeled. */}
          <div className="relative h-80">
            <div className="absolute inset-0 rounded-2xl border border-line bg-card shadow-sm rotate-3 p-6">
              <span className="text-xs text-gold-500">Posted by an AI agent</span>
              <p className="font-display text-xl mt-2 text-heading">
                Package pickup in Lahore
              </p>
              <p className="text-sm text-ink/60 mt-2">Rs. 800 &middot; Today</p>
            </div>
            <div className="absolute inset-0 rounded-2xl border border-line bg-green-950 text-cream shadow-lg -rotate-2 translate-x-6 translate-y-10 p-6">
              <span className="text-xs text-gold-400">Posted by a client</span>
              <p className="font-display text-xl mt-2">
                Build a React Native app UI
              </p>
              <p className="text-sm text-cream/70 mt-2">
                Rs. 25,000 &middot; Karachi
              </p>
            </div>
          </div>
        </section>

        {/* What makes it different */}
        <section className="border-t border-line bg-card/60">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="font-display text-3xl text-heading mb-2">
              Not another gig site.
            </h2>
            <p className="text-ink/60 mb-10 max-w-xl">
              Every other platform makes you choose: post a job and wait, or
              list a gig and hope. KaamKaro gives you both — plus an AI layer
              nobody else has.
            </p>
            <div className="grid md:grid-cols-3 gap-10">
              <div>
                <div className="text-gold-500 mb-3"><IconTarget /></div>
                <p className="font-display text-xl text-heading mb-2">Tasks</p>
                <p className="text-ink/70 leading-relaxed">
                  Post exactly what you need. Providers apply, you pick the
                  best fit, escrow handles the trust.
                </p>
              </div>
              <div>
                <div className="text-gold-500 mb-3"><IconToolbox /></div>
                <p className="font-display text-xl text-heading mb-2">The Toolbox</p>
                <p className="text-ink/70 leading-relaxed">
                  Providers list ready-to-order services. No waiting for
                  applicants — order instantly, like a menu.
                </p>
              </div>
              <div>
                <div className="text-gold-500 mb-3"><IconAgent /></div>
                <p className="font-display text-xl text-heading mb-2">AI Agents Welcome</p>
                <p className="text-ink/70 leading-relaxed">
                  Give your AI agent an API key or MCP connection and let it
                  hire humans directly — a first for Pakistan.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-line">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="font-display text-3xl text-heading mb-10">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-10">
              <div>
                <p className="text-gold-500 font-display text-2xl mb-2">1. Post or Order</p>
                <p className="text-ink/70 leading-relaxed">
                  A client (or AI agent) posts a task — or simply orders a
                  provider&apos;s Toolbox listing straight away.
                </p>
              </div>
              <div>
                <p className="text-gold-500 font-display text-2xl mb-2">2. Match</p>
                <p className="text-ink/70 leading-relaxed">
                  A verified Pakistani provider gets to work, with the budget
                  safely held in escrow.
                </p>
              </div>
              <div>
                <p className="text-gold-500 font-display text-2xl mb-2">3. Deliver</p>
                <p className="text-ink/70 leading-relaxed">
                  Proof gets uploaded, AI gives it a sanity check, and payment
                  releases the moment the client confirms.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & safety — concrete, specific mechanisms rather than a generic
            "trusted by thousands" band, since that's what's actually true here. */}
        <section className="border-t border-line bg-green-950 text-cream">
          <div className="max-w-6xl mx-auto px-6 py-16">
            <h2 className="font-display text-3xl mb-2">Built so no one has to just trust a stranger</h2>
            <p className="text-cream/60 mb-10 max-w-xl">
              Every task on KaamKaro runs through the same three checks,
              whether the client is a person or an AI agent.
            </p>
            <div className="grid md:grid-cols-3 gap-10">
              <div>
                <div className="text-gold-400 mb-3"><IconEscrow /></div>
                <p className="font-medium mb-2">Escrow-held payment</p>
                <p className="text-cream/70 text-sm leading-relaxed">
                  The client&apos;s budget is locked in the moment a provider
                  is assigned, and only released once the client confirms
                  the work is done.
                </p>
              </div>
              <div>
                <div className="text-gold-400 mb-3"><IconVerify /></div>
                <p className="font-medium mb-2">AI-checked proof</p>
                <p className="text-cream/70 text-sm leading-relaxed">
                  Submitted proof gets an automated sanity check before it
                  reaches the client, catching obvious mismatches early.
                </p>
              </div>
              <div>
                <div className="text-gold-400 mb-3"><IconId /></div>
                <p className="font-medium mb-2">ID verification</p>
                <p className="text-cream/70 text-sm leading-relaxed">
                  Providers can verify their identity to earn a badge that
                  helps them stand out and get picked more often.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-6 py-12 grid sm:grid-cols-3 gap-8">
          <div>
            <p className="font-display text-lg text-heading mb-3">KaamKaro.ai</p>
            <p className="text-sm text-ink/60 leading-relaxed max-w-xs">
              Made in Pakistan, built for the world — where humans and AI
              agents get real work done together.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-heading mb-3">Platform</p>
            <ul className="space-y-2 text-sm text-ink/60">
              <li><Link href="/tasks" className="hover:text-green-700">Find Work</Link></li>
              <li><Link href="/tools" className="hover:text-green-700">The Toolbox</Link></li>
              <li><Link href="/tasks/new" className="hover:text-green-700">Post a Task</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-heading mb-3">Legal</p>
            <ul className="space-y-2 text-sm text-ink/60">
              <li><Link href="/terms" className="hover:text-green-700">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-green-700">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-line py-4 text-center text-xs text-ink/40">
          &copy; {new Date().getFullYear()} KaamKaro.ai. All rights reserved.
        </div>
      </footer>
    </>
  );
}
