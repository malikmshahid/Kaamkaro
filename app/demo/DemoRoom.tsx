"use client";

import Link from "next/link";
import { useState } from "react";

type DemoStep = 0 | 1 | 2 | 3 | 4;
const steps = ["Your brief", "Clear scope", "Smart match", "Proof review", "Work receipt"] as const;
const sampleBrief = "Mujhe apne home bakery ke liye simple, classy logo chahiye — Instagram par bhi achha lage.";

function Icon({ name, className = "h-5 w-5" }: { name: "spark" | "check" | "shield" | "arrow" | "refresh" | "pin" | "clock"; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z"/></>,
    check: <path d="m5 12 4 4L19 6" />,
    shield: <><path d="M12 3 4.5 6v5c0 4.8 3.2 8.4 7.5 10 4.3-1.6 7.5-5.2 7.5-10V6L12 3Z"/><path d="m9 12 2 2 4-4"/></>,
    arrow: <><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M4.9 9A7.5 7.5 0 0 1 18 6.5L20 12M4 17v-5h5"/><path d="M19.1 15A7.5 7.5 0 0 1 6 17.5L4 12"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}>{paths[name]}</svg>;
}

function StepMark({ state }: { state: "done" | "active" | "upcoming" }) {
  return <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${state === "done" ? "border-green-800 bg-green-900 text-cream" : state === "active" ? "border-gold-500 bg-gold-100 text-green-950 dark:bg-gold-500/20 dark:text-gold-200" : "border-line bg-paper text-ink/35"}`}>{state === "done" ? <Icon name="check" className="h-4 w-4" /> : null}</span>;
}

export default function DemoRoom() {
  const [brief, setBrief] = useState(sampleBrief);
  const [step, setStep] = useState<DemoStep>(0);
  const [error, setError] = useState("");
  const shortBrief = brief.trim().length > 76 ? `${brief.trim().slice(0, 73)}…` : brief.trim();

  function begin() {
    if (brief.trim().length < 12) {
      setError("Thora sa detail likhein—kis cheez ki zaroorat hai?");
      return;
    }
    setError("");
    setStep(1);
  }

  function restart() {
    setBrief(sampleBrief);
    setError("");
    setStep(0);
  }

  const goNext = () => setStep((current) => Math.min(4, current + 1) as DemoStep);
  const goBack = () => setStep((current) => Math.max(0, current - 1) as DemoStep);

  return (
    <main className="flex-1">
      <section className="aurora grain relative isolate overflow-hidden border-b border-line">
        <div className="mx-auto max-w-6xl px-5 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[.18em] text-gold-600 dark:text-gold-300"><Icon name="spark" className="h-3.5 w-3.5"/> Interactive walkthrough</span>
            <h1 className="mt-5 font-display text-4xl leading-[1.04] tracking-tight text-heading sm:text-6xl">A job, from idea<br className="hidden sm:block"/> to <span className="gold-text">proof.</span></h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink/65 sm:text-lg">See how a clear brief, a thoughtful match and reviewed proof fit together—before you create an account.</p>
            <div className="mx-auto mt-5 inline-flex max-w-full items-start gap-2 rounded-xl border border-gold-500/25 bg-gold-500/5 px-3.5 py-2.5 text-left text-xs leading-relaxed text-ink/60 sm:items-center"><span className="mt-0.5 shrink-0 rounded bg-gold-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-700 dark:text-gold-300 sm:mt-0">Demo</span><span>Sample flow only. No job is posted, no real provider is shown and no payment is involved.</span></div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-7">
          <aside className="card-lux rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-ink/40">The journey</p><span className="text-[11px] tabular-nums text-ink/40">{step + 1} / 5</span></div>
            <ol className="grid grid-cols-5 gap-1.5 lg:grid-cols-1 lg:gap-0">
              {steps.map((label, index) => {
                const state = index < step ? "done" : index === step ? "active" : "upcoming";
                return <li key={label} className="min-w-0 lg:relative lg:flex lg:items-start lg:gap-3 lg:pb-5 last:lg:pb-0">
                  {index < steps.length - 1 && <span aria-hidden="true" className={`absolute left-4 top-8 hidden h-[calc(100%-1rem)] w-px lg:block ${index < step ? "bg-green-800/60" : "bg-line"}`} />}
                  <span className="flex flex-col items-center gap-1.5 lg:flex-row lg:items-start lg:gap-3"><StepMark state={state}/><span className={`hidden pt-1 text-sm font-medium lg:block ${state === "active" ? "text-heading" : state === "done" ? "text-green-800 dark:text-green-300" : "text-ink/40"}`}>{label}</span><span className="max-w-full truncate text-center text-[9px] leading-tight text-ink/45 sm:text-[10px] lg:hidden">{label}</span></span>
                </li>;
              })}
            </ol>
            <div className="mt-5 hidden rounded-xl border border-line bg-paper/50 p-3.5 lg:block"><div className="flex items-center gap-2 text-xs font-semibold text-heading"><Icon name="shield" className="h-4 w-4 text-green-800"/> People stay in control</div><p className="mt-1.5 text-xs leading-relaxed text-ink/50">AI can help draft and review. People make the decisions that matter.</p></div>
          </aside>

          <section className="card-lux min-h-[470px] overflow-hidden rounded-2xl" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4 sm:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-gold-600 dark:text-gold-300">{step === 0 ? "01 · Start with your idea" : `0${step + 1} · ${steps[step]}`}</p><h2 className="mt-1 font-display text-xl text-heading sm:text-2xl">{step === 0 ? "What do you need done?" : step === 1 ? "Turn a rough idea into a clear brief" : step === 2 ? "See how a match is explained" : step === 3 ? "Review proof, not just promises" : "Finish with a portable work record"}</h2></div><button type="button" onClick={restart} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink/55 transition hover:border-green-800/40 hover:text-green-900"><Icon name="refresh" className="h-3.5 w-3.5"/> Start over</button></div>

            <div className="p-5 sm:p-7">
              {step === 0 && <div className="mx-auto max-w-2xl py-3">
                <label htmlFor="demo-brief" className="block text-sm font-semibold text-heading">Describe the outcome in your own words</label>
                <p className="mt-1 text-xs leading-relaxed text-ink/50">English, Urdu ya Roman Urdu—demo mein aapka text browser se bahar nahi jata.</p>
                <textarea id="demo-brief" rows={4} maxLength={300} value={brief} onChange={(event) => { setBrief(event.target.value); setError(""); }} className="mt-4 w-full resize-y rounded-2xl border border-line bg-paper/65 p-4 text-sm leading-relaxed text-ink outline-none transition placeholder:text-ink/35 focus:border-green-800 focus:ring-2 focus:ring-green-800/15" placeholder="Example: Mujhe apne cafe ke liye menu design karwana hai…" />
                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-ink/40"><button type="button" onClick={() => { setBrief(sampleBrief); setError(""); }} className="underline decoration-line underline-offset-4 hover:text-green-800">Use the sample idea</button><span>{brief.length}/300</span></div>
                {error && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
                <div className="mt-6 flex flex-wrap items-center gap-3"><button type="button" onClick={begin} className="sheen inline-flex items-center gap-2 rounded-full bg-green-900 px-6 py-3 text-sm font-semibold text-cream shadow-lux-sm transition hover:-translate-y-0.5 hover:bg-green-800">Show me the journey <Icon name="arrow" className="h-4 w-4"/></button><span className="text-xs text-ink/45">About 45 seconds · no signup</span></div>
              </div>}

              {step === 1 && <div className="grid gap-5 md:grid-cols-[1.1fr_.9fr]">
                <div className="rounded-2xl border border-line bg-paper/45 p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-2 text-xs font-semibold text-heading"><Icon name="spark" className="h-4 w-4 text-gold-600"/> Example task brief</span><span className="rounded-full bg-gold-500/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-gold-700 dark:text-gold-300">Illustrative</span></div><p className="mt-4 rounded-xl bg-card px-3.5 py-3 text-sm italic leading-relaxed text-ink/65">“{brief.trim()}”</p><h3 className="mt-4 break-words font-semibold text-heading">{shortBrief}</h3><p className="mt-2 text-sm leading-relaxed text-ink/60">A useful brief makes the expected result concrete. Agree the exact deliverable, format, deadline and revision count before anyone starts.</p><ul className="mt-4 space-y-2">{["Name the outcome—not just the activity", "List files, actions or evidence expected", "Agree deadline and one revision rule", "Set a budget everyone can see"].map((item) => <li key={item} className="flex items-start gap-2 text-xs text-ink/60"><span className="mt-0.5 text-green-800"><Icon name="check" className="h-3.5 w-3.5"/></span>{item}</li>)}</ul></div>
                <div className="flex flex-col gap-3"><div className="rounded-2xl border border-gold-500/25 bg-gold-500/5 p-4"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold-700 dark:text-gold-300">Price fairness</p><p className="mt-2 font-display text-2xl text-heading">Context before commitment</p><p className="mt-1 text-xs leading-relaxed text-ink/55">The real flow can compare a budget with relevant marketplace activity. This demo invents no rate or quote.</p></div><div className="rounded-2xl border border-line p-4"><p className="text-xs font-semibold text-heading">Why define the deliverable?</p><p className="mt-1.5 text-xs leading-relaxed text-ink/55">A checklist gives both sides the same finish line—fewer surprises, clearer proof, easier review.</p></div><p className="text-[11px] leading-relaxed text-ink/40">This is a fixed walkthrough, not a live AI request. No listing has been created.</p></div>
              </div>}

              {step === 2 && <div className="mx-auto max-w-2xl"><div className="mb-4 flex items-start gap-3 rounded-xl border border-line bg-paper/45 p-3.5"><span className="rounded-lg bg-green-900/8 p-2 text-green-800 dark:bg-green-500/15 dark:text-green-300"><Icon name="pin"/></span><div><p className="text-xs font-semibold text-heading">A good match is more than a name</p><p className="mt-1 text-xs leading-relaxed text-ink/50">The platform can show relevant skills, location and verified work signals so a client can compare the reasons—not just a rank.</p></div></div><div className="rounded-2xl border border-green-800/20 bg-green-900/[.025] p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15 font-display text-lg text-gold-700 dark:text-gold-200">D</div><div><p className="font-semibold text-heading">Example provider profile</p><p className="mt-0.5 text-xs text-ink/45">Fictional sample · not an active provider</p></div></div><span className="rounded-full border border-green-800/20 px-2.5 py-1 text-[10px] font-semibold text-green-800 dark:text-green-300">Illustrative fit</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-card p-3"><p className="text-[10px] uppercase tracking-wide text-ink/40">Relevant skills</p><p className="mt-1 text-xs font-medium text-heading">Relevant to the brief</p></div><div className="rounded-xl bg-card p-3"><p className="text-[10px] uppercase tracking-wide text-ink/40">Location</p><p className="mt-1 text-xs font-medium text-heading">Shown if it matters</p></div><div className="rounded-xl bg-card p-3"><p className="text-[10px] uppercase tracking-wide text-ink/40">Trust signals</p><p className="mt-1 text-xs font-medium text-heading">Explained, never invented</p></div></div><p className="mt-4 text-xs leading-relaxed text-ink/55">A real shortlist should be built from actual profiles and should explain why each person is relevant. This card is only a visual example.</p></div><p className="mt-4 text-[11px] text-ink/40">No real profile or personal data is used in this demo.</p></div>}

              {step === 3 && <div className="grid gap-5 md:grid-cols-[.9fr_1.1fr]"><div className="rounded-2xl border border-line bg-paper/45 p-4 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-gold-700 dark:text-gold-300">Sample submission</p><div className="mt-4 flex aspect-[4/3] items-center justify-center rounded-xl border border-dashed border-green-800/20 bg-gradient-to-br from-green-900/[.06] via-card to-gold-500/[.07]"><div className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-green-800 shadow-lux-sm"><Icon name="check" className="h-7 w-7"/></span><p className="mt-3 text-sm font-semibold text-heading">Example deliverables attached</p><p className="mt-1 text-xs text-ink/45">Preview artwork · export files · revision note</p></div></div><p className="mt-3 text-[11px] text-ink/40">Illustration only—no uploaded file or evidence is being assessed.</p></div><div><h3 className="font-display text-lg text-heading">Helpful signals, human decision</h3><p className="mt-1 text-sm leading-relaxed text-ink/55">A proof review can surface useful checks. It should not replace the client’s judgment or decide payment on its own.</p><div className="mt-4 space-y-2.5">{[{title:"Deliverables listed",text:"The sample checklist items are shown as present."},{title:"Task alignment",text:"The evidence appears related to the agreed logo brief."},{title:"Human review",text:"Client checks the actual files and can request a revision."}].map((item) => <div key={item.title} className="flex gap-3 rounded-xl border border-line bg-card p-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-900/8 text-green-800 dark:bg-green-500/15 dark:text-green-300"><Icon name="check" className="h-3.5 w-3.5"/></span><div><p className="text-xs font-semibold text-heading">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-ink/50">{item.text}</p></div></div>)}</div><div className="mt-4 rounded-xl border border-gold-500/20 bg-gold-500/5 p-3.5 text-xs leading-relaxed text-ink/55"><strong className="text-heading">Important:</strong> AI can be wrong. A real decision should use the brief, evidence and human review together.</div></div></div>}

              {step === 4 && <div className="mx-auto max-w-2xl"><div className="overflow-hidden rounded-2xl border border-green-800/20 bg-card shadow-lux-sm"><div className="flex flex-wrap items-center justify-between gap-3 bg-green-950 px-4 py-4 text-cream sm:px-6"><div><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-gold-300">KaamKaro · sample</p><h3 className="mt-1 font-display text-xl">Work receipt preview</h3></div><span className="rounded-full border border-cream/25 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-gold-200">Not a real receipt</span></div><div className="p-4 sm:p-6"><div className="grid gap-3 sm:grid-cols-2"><div><p className="text-[10px] uppercase tracking-wide text-ink/40">Example job</p><p className="mt-1 break-words text-sm font-semibold text-heading">{shortBrief}</p></div><div><p className="text-[10px] uppercase tracking-wide text-ink/40">Status</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-green-800 dark:text-green-300"><Icon name="check" className="h-4 w-4"/> Example complete</p></div><div><p className="text-[10px] uppercase tracking-wide text-ink/40">Evidence</p><p className="mt-1 text-sm text-ink/70">Example brief + deliverable checklist</p></div><div><p className="text-[10px] uppercase tracking-wide text-ink/40">Record ID</p><p className="mt-1 font-mono text-xs text-ink/70">DEMO-ONLY · NO VERIFICATION</p></div></div><div className="mt-5 rounded-xl border border-line bg-paper/50 p-3 text-xs leading-relaxed text-ink/55"><span className="font-semibold text-heading">Demo disclaimer:</span> This is a visual sample. It is not stored, cannot be verified, and does not represent a transaction or payment.</div></div></div><div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-heading">Want to start your own brief?</p><p className="mt-1 text-xs text-ink/50">A real task requires an account. Posting and payment terms are shown in the actual flow.</p></div><Link href="/signup" className="sheen inline-flex items-center gap-2 rounded-full bg-green-900 px-5 py-3 text-sm font-semibold text-cream transition hover:-translate-y-0.5 hover:bg-green-800">Create your account <Icon name="arrow" className="h-4 w-4"/></Link></div></div>}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/40 px-5 py-4 sm:px-7"><button type="button" onClick={goBack} disabled={step === 0} className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink/60 transition hover:border-green-800/40 hover:text-green-900 disabled:cursor-not-allowed disabled:opacity-35">Back</button><div className="flex gap-1.5" aria-label="Demo progress">{steps.map((label, index) => <span key={label} className={`h-1.5 w-5 rounded-full sm:w-7 ${index <= step ? "bg-green-800" : "bg-line"}`} />)}</div>{step < 4 ? <button type="button" onClick={step === 0 ? begin : goNext} className="inline-flex items-center gap-2 rounded-full bg-green-900 px-5 py-2.5 text-xs font-semibold text-cream transition hover:bg-green-800">{step === 0 ? "Start walkthrough" : "Next step"}<Icon name="arrow" className="h-3.5 w-3.5"/></button> : <button type="button" onClick={restart} className="rounded-full border border-gold-500/35 px-5 py-2.5 text-xs font-semibold text-gold-700 transition hover:bg-gold-500/10 dark:text-gold-300">Replay demo</button>}</div>
          </section>
        </div>
        <div className="mx-auto mt-8 max-w-6xl px-1"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-line bg-card/50 p-3.5 text-xs leading-relaxed text-ink/55"><strong className="text-heading">Clear scope.</strong> Agree what “done” means before work starts.</div><div className="rounded-xl border border-line bg-card/50 p-3.5 text-xs leading-relaxed text-ink/55"><strong className="text-heading">Visible reasoning.</strong> See which signals inform a match or review.</div><div className="rounded-xl border border-line bg-card/50 p-3.5 text-xs leading-relaxed text-ink/55"><strong className="text-heading">Human control.</strong> Recommendations help; people decide.</div></div></div>
      </section>
    </main>
  );
}
