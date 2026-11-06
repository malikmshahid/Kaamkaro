"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/constants";
import { CURRENCIES } from "@/lib/currency";

type SiteContent = {
  heroEyebrow: string;
  heroLineOne: string;
  heroAccent: string;
  heroLineTwo: string;
  heroSubheading: string;
  howItWorksEyebrow: string;
  howItWorksTitle: string;
  howItWorksSteps: { title: string; body: string }[];
  aiSectionEyebrow: string;
  aiSectionTitle: string;
  aiSectionBody: string;
  trustSectionEyebrow: string;
  trustSectionTitle: string;
  trustSectionBody: string;
  trustChecks: { title: string; body: string }[];
  footerDescription: string;
  primaryCta: string;
  secondaryCta: string;
  supportEmail: string;
  trustPoints: string[];
  categorySectionEyebrow: string;
  categorySectionTitle: string;
  faqEyebrow: string;
  faqTitle: string;
  closingEyebrow: string;
  closingTitle: string;
  closingBody: string;
  closingPrimaryCta: string;
  closingSecondaryCta: string;
  faqs: { question: string; answer: string }[];
};
type Marketplace = {
  minTaskBudget: number;
  maxTaskBudget: number;
  minTaskLifetimeHours: number;
  maxTaskLifetimeDays: number;
  defaultCurrency: string;
  enabledCategories: string[];
  categoryLabels: { value: string; label: string }[];
};
type AiFeatures = {
  taskCopilotEnabled: boolean;
  proposalCopilotEnabled: boolean;
  proofAssistEnabled: boolean;
};
type AuditEntry = {
  id: string;
  actorId: string;
  section: string;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
  createdAt: string;
};
const defaultAiFeatures: AiFeatures = { taskCopilotEnabled: true, proposalCopilotEnabled: true, proofAssistEnabled: true };
const inputClass = "mt-1.5 w-full rounded-xl border border-line bg-paper/60 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-700/20";
const defaultSite: SiteContent = {
  heroEyebrow: "Clear scope · work worldwide",
  heroLineOne: "Work starts here.",
  heroAccent: "Anywhere",
  heroLineTwo: "with clarity.",
  heroSubheading: "A marketplace for local and digital work. Share what you need, compare proposals and review deliverables against a clear brief. Optional AI assists; people stay in control.",
  howItWorksEyebrow: "Three steps, no guesswork",
  howItWorksTitle: "Clear scope to reviewed work, with less chasing",
  howItWorksSteps: [
    { title: "Describe it, or start with AI", body: "Share one rough idea in English, Urdu or Roman Urdu. Optional AI drafting helps make a clearer brief—you review every detail before it goes live." },
    { title: "Compare proposals with reasons", body: "Review provider proposals, relevant skills and available trust signals. Choose only when the scope and terms make sense to you." },
    { title: "Review the submitted work", body: "Check proof against agreed deliverables. AI can assist when enabled, but you remain in control of review and completion." },
  ],
  aiSectionEyebrow: "A useful edge, not a black box",
  aiSectionTitle: "AI that takes friction out of the work",
  aiSectionBody: "Optional assistance can clarify a brief, help draft a proposal and surface proof-review signals. Every suggestion stays editable, and people make the final decision.",
  trustSectionEyebrow: "Clear terms, people in control",
  trustSectionTitle: "Know the task terms before work starts",
  trustSectionBody: "Review scope and any payment methods shown in the task before committing. AI signals are advisory; people review and confirm.",
  trustChecks: [
    { title: "Scope and terms in the task", body: "Review the brief, budget and any payment details shown before you agree to start." },
    { title: "Proof linked to the work", body: "Submitted files and notes sit alongside the agreed deliverables for review." },
    { title: "Identity signals you can inspect", body: "Verification badges are visible signals, not a guarantee of outcome." },
  ],
  footerDescription: "A marketplace for local and digital work—clear briefs, useful AI assistance and people in control from start to finish.",
  primaryCta: "Post a task — free",
  secondaryCta: "Browse open tasks",
  supportEmail: "support@kaamkaro.ai",
  trustPoints: ["No signup fee, no monthly plan", "Review the work before marking it complete", "AI proof assistance when enabled; people decide", "Works for AI agents too (API keys)"],
  categorySectionEyebrow: "What gets done here",
  categorySectionTitle: "kinds of work, one place",
  faqEyebrow: "Straight answers",
  faqTitle: "Questions people actually ask",
  closingEyebrow: "Start in two minutes",
  closingTitle: "Start good work, anywhere.",
  closingBody: "Free to post. Clear expectations, optional AI assistance and human review. Rooted in Pakistan, open to the world.",
  closingPrimaryCta: "Create a free account",
  closingSecondaryCta: "Browse tasks first",
  faqs: [
    { question: "When is a task marked complete?", answer: "After you review the submitted work and explicitly confirm completion. Payment and payout availability depend on the methods enabled for that task; check the terms shown in the product before starting." },
    { question: "What if the work is wrong or fake?", answer: "Do not confirm completion. Open a dispute so the available proof and conversation can be reviewed under the platform's dispute process. AI signals are advisory; a human makes the review decision." },
    { question: "What does SafarWorks charge?", answer: "Posting is free. Any applicable platform fee is shown in the task flow before you commit; there are no bidding credits or connects." },
    { question: "Do I need a bank account to browse?", answer: "No account is needed to browse public listings. Account and payment requirements, when relevant, are shown in the actual task flow." },
    { question: "Can people use SafarWorks from outside Pakistan?", answer: "SafarWorks is designed for clients and providers in multiple markets. Available currencies, task categories and payment options can vary by region and task; check the terms shown before committing." },
  ],
};
const defaultMarketplace: Marketplace = {
  minTaskBudget: 100,
  maxTaskBudget: 5_000_000,
  minTaskLifetimeHours: 1,
  maxTaskLifetimeDays: 90,
  defaultCurrency: "PKR",
  enabledCategories: CATEGORIES.map((c) => c.value),
  categoryLabels: CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
};

export default function PlatformSettingsPanel() {
  const [site, setSite] = useState<SiteContent>(defaultSite);
  const [marketplace, setMarketplace] = useState<Marketplace>(defaultMarketplace);
  const [aiFeatures, setAiFeatures] = useState<AiFeatures>(defaultAiFeatures);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"siteContent" | "marketplace" | "aiFeatures" | "commission" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load settings.");
      setSite({ ...defaultSite, ...data.settings.siteContent });
      setMarketplace({ ...defaultMarketplace, ...data.settings.marketplace });
      setAiFeatures({ ...defaultAiFeatures, ...data.settings.aiFeatures });
      setAudit(Array.isArray(data.audit) ? data.audit : []);
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not load settings." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function restore(entry: AuditEntry) {
    const section = entry.section === "siteContent" || entry.section === "marketplace" || entry.section === "aiFeatures" || entry.section === "commission" ? entry.section : null;
    if (!section) return;
    const label = section === "siteContent" ? "site content" : section === "marketplace" ? "marketplace settings" : section === "aiFeatures" ? "AI feature controls" : "commission rate";
    if (!window.confirm(`Restore the previous ${label}? This will create a new audit entry.`)) return;
    setSaving(section);
    setNotice(null);
    try {
      const res = section === "commission"
        ? await fetch("/api/admin/settings/commission", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ commissionRatePercent: entry.beforeValue.commissionRatePercent }),
          })
        : await fetch("/api/admin/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section, value: entry.beforeValue }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed.");
      setNotice({ tone: "ok", text: "Previous settings restored and recorded in the audit log." });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Restore failed." });
    } finally {
      setSaving(null);
    }
  }

  async function save(section: "siteContent" | "marketplace" | "aiFeatures") {
    setSaving(section);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, value: section === "siteContent" ? site : section === "marketplace" ? marketplace : aiFeatures }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Settings were not saved.");
      setNotice({ tone: "ok", text: "Saved. Public pages and forms now use these settings." });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Settings were not saved." });
    } finally {
      setSaving(null);
    }
  }

  const textField = (key: keyof SiteContent, label: string, help?: string) => (
    <label key={key} className="block text-sm font-medium text-ink/75">
      {label}
      {help && <span className="ml-1 font-normal text-ink/40">· {help}</span>}
      {key === "heroSubheading" || key === "closingBody" || key === "aiSectionBody" || key === "trustSectionBody" || key === "footerDescription" ? (
        <textarea rows={key === "heroSubheading" ? 4 : 3} maxLength={key === "heroSubheading" ? 420 : key === "closingBody" ? 320 : key === "aiSectionBody" ? 300 : key === "trustSectionBody" ? 260 : 240} className={inputClass} value={site[key] as string} onChange={(e) => setSite({ ...site, [key]: e.target.value })} />
      ) : (
        <input type={key === "supportEmail" ? "email" : "text"} maxLength={key === "heroEyebrow" ? 80 : key === "primaryCta" || key === "secondaryCta" || key === "closingPrimaryCta" || key === "closingSecondaryCta" ? 44 : 120} className={inputClass} value={site[key] as string} onChange={(e) => setSite({ ...site, [key]: e.target.value })} />
      )}
      {(key === "heroSubheading" || key === "closingBody" || key === "aiSectionBody" || key === "trustSectionBody" || key === "footerDescription") && <span className="mt-1 block text-right text-[11px] font-normal text-ink/40">{(site[key] as string).length}/{key === "heroSubheading" ? 420 : key === "closingBody" ? 320 : key === "aiSectionBody" ? 300 : key === "trustSectionBody" ? 260 : 240}</span>}
    </label>
  );

  if (loading) return <div className="grid gap-4 lg:grid-cols-2"><div className="card-lux h-64 animate-pulse rounded-2xl" /><div className="card-lux h-64 animate-pulse rounded-2xl" /></div>;

  return (
    <div role="tabpanel" id="panel-settings" aria-labelledby="tab-settings" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-gold-600 dark:text-gold-300">Admin-controlled, validated, audited</p>
          <h2 className="mt-1 font-display text-2xl text-heading">Platform settings</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink/55">Changes affect new work and public content. Payment credentials, identity documents, and escrow records are intentionally not editable here.</p>
        </div>
        <button type="button" onClick={() => void load()} className="rounded-full border border-line bg-card px-4 py-2 text-xs font-semibold text-ink/65 hover:border-green-700/40">Refresh</button>
      </div>

      {notice && <p role="status" className={`rounded-xl border px-4 py-3 text-sm ${notice.tone === "ok" ? "border-green-700/20 bg-green-700/5 text-green-800 dark:text-green-300" : "border-red-400/30 bg-red-500/5 text-red-700 dark:text-red-300"}`}>{notice.text}</p>}

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="card-lux rounded-2xl p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">01 · Site content</p><h3 className="mt-1 font-display text-xl text-heading">Homepage & support</h3></div>
            <span className="rounded-full bg-gold-100 px-2.5 py-1 text-[10px] font-semibold text-gold-600 dark:bg-gold-500/15 dark:text-gold-300">Live content</span>
          </div>
          <div className="space-y-3.5">
            {textField("heroEyebrow", "Eyebrow")}
            <div className="grid gap-3 sm:grid-cols-2">{textField("heroLineOne", "Headline · first line")}{textField("heroAccent", "Headline · gold word")}</div>
            {textField("heroLineTwo", "Headline · second line")}
            {textField("heroSubheading", "Homepage introduction", "420 characters max")}
            <div className="grid gap-3 sm:grid-cols-2">{textField("primaryCta", "Primary button")}{textField("secondaryCta", "Secondary button")}</div>
            {textField("supportEmail", "Support email")}
            <div className="rounded-xl border border-line bg-paper/40 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-heading">Trust bullets</p><p className="mt-0.5 text-xs text-ink/45">The four promises below the homepage hero.</p></div><button type="button" disabled={site.trustPoints.length >= 6} onClick={() => setSite({ ...site, trustPoints: [...site.trustPoints, "New platform benefit"] })} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink/60 disabled:opacity-40">+ Add</button></div>
              <div className="mt-3 space-y-2">{site.trustPoints.map((point, index) => <div key={index} className="flex items-center gap-2"><input maxLength={100} aria-label={`Homepage trust bullet ${index + 1}`} className={inputClass + " mt-0"} value={point} onChange={(e) => setSite({ ...site, trustPoints: site.trustPoints.map((value, i) => i === index ? e.target.value : value) })} /><button type="button" aria-label="Remove trust bullet" disabled={site.trustPoints.length <= 2} onClick={() => setSite({ ...site, trustPoints: site.trustPoints.filter((_, i) => i !== index) })} className="rounded-lg px-2 py-2 text-ink/40 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30">×</button></div>)}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{textField("categorySectionEyebrow", "Category section eyebrow")}{textField("categorySectionTitle", "Category section title")}{textField("howItWorksEyebrow", "How-it-works eyebrow")}{textField("howItWorksTitle", "How-it-works headline")}{textField("aiSectionEyebrow", "AI section eyebrow")}{textField("aiSectionTitle", "AI section headline")}{textField("aiSectionBody", "AI section description")}{textField("trustSectionEyebrow", "Trust section eyebrow")}{textField("trustSectionTitle", "Trust section headline")}{textField("trustSectionBody", "Trust section description")}</div>
            <div className="rounded-xl border border-line bg-paper/40 p-4">
              <div className="mb-3"><p className="text-sm font-semibold text-heading">How it works · three steps</p><p className="mt-0.5 text-xs text-ink/45">Edit the public homepage steps. This copy does not change payment or dispute rules.</p></div>
              <div className="space-y-3">{site.howItWorksSteps.map((item, index) => <div key={index} className="rounded-xl border border-line bg-card p-3"><label className="block text-xs font-semibold text-ink/55">Step {index + 1} title<input maxLength={80} className={inputClass} value={item.title} onChange={(e) => setSite({ ...site, howItWorksSteps: site.howItWorksSteps.map((step, i) => i === index ? { ...step, title: e.target.value } : step) })} /></label><label className="mt-2 block text-xs font-semibold text-ink/55">Step description<textarea rows={3} maxLength={340} className={inputClass} value={item.body} onChange={(e) => setSite({ ...site, howItWorksSteps: site.howItWorksSteps.map((step, i) => i === index ? { ...step, body: e.target.value } : step) })} /></label></div>)}</div>
            </div>
            <div className="rounded-xl border border-line bg-paper/40 p-4">
              <div className="mb-3"><p className="text-sm font-semibold text-heading">Trust section checks</p><p className="mt-0.5 text-xs text-ink/45">Keep payment and verification claims aligned with what is actually enabled.</p></div>
              <div className="space-y-3">{site.trustChecks.map((item, index) => <div key={index} className="rounded-xl border border-line bg-card p-3"><label className="block text-xs font-semibold text-ink/55">Check {index + 1} title<input maxLength={90} className={inputClass} value={item.title} onChange={(e) => setSite({ ...site, trustChecks: site.trustChecks.map((check, i) => i === index ? { ...check, title: e.target.value } : check) })} /></label><label className="mt-2 block text-xs font-semibold text-ink/55">Check description<textarea rows={2} maxLength={260} className={inputClass} value={item.body} onChange={(e) => setSite({ ...site, trustChecks: site.trustChecks.map((check, i) => i === index ? { ...check, body: e.target.value } : check) })} /></label></div>)}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{textField("faqEyebrow", "FAQ eyebrow")}{textField("faqTitle", "FAQ title")}</div>
            <div className="rounded-xl border border-line bg-paper/40 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-heading">Homepage FAQ</p><p className="mt-0.5 text-xs text-ink/45">3–8 entries; each answer up to 650 characters.</p></div><button type="button" disabled={site.faqs.length >= 8} onClick={() => setSite({ ...site, faqs: [...site.faqs, { question: "New question", answer: "Add a clear answer." }] })} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink/60 disabled:opacity-40">+ Add FAQ</button></div>
              <div className="mt-3 space-y-3">{site.faqs.map((faq, index) => <div key={index} className="rounded-xl border border-line bg-card p-3"><div className="flex items-center gap-2"><input aria-label={`FAQ question ${index + 1}`} maxLength={160} className={inputClass + " mt-0"} value={faq.question} onChange={(e) => setSite({ ...site, faqs: site.faqs.map((item, i) => i === index ? { ...item, question: e.target.value } : item) })} /><button type="button" aria-label="Remove FAQ" disabled={site.faqs.length <= 3} onClick={() => setSite({ ...site, faqs: site.faqs.filter((_, i) => i !== index) })} className="rounded-lg px-2 py-2 text-ink/40 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30">×</button></div><textarea aria-label={`FAQ answer ${index + 1}`} rows={3} maxLength={650} className={inputClass} value={faq.answer} onChange={(e) => setSite({ ...site, faqs: site.faqs.map((item, i) => i === index ? { ...item, answer: e.target.value } : item) })} /></div>)}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{textField("closingEyebrow", "Final section eyebrow")}{textField("closingTitle", "Final section headline")}{textField("closingBody", "Final section description")}{textField("closingPrimaryCta", "Final primary button")}{textField("closingSecondaryCta", "Final secondary button")}{textField("footerDescription", "Footer brand description")}</div>
          </div>
          <button type="button" disabled={!!saving} onClick={() => void save("siteContent")} className="mt-5 w-full rounded-full bg-green-900 px-5 py-3 text-sm font-semibold text-cream shadow-lux-sm transition hover:bg-green-800 disabled:opacity-50">{saving === "siteContent" ? "Saving…" : "Save site content"}</button>
        </section>

        <section className="card-lux rounded-2xl p-5 sm:p-6">
          <div className="mb-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">02 · Marketplace policy</p><h3 className="mt-1 font-display text-xl text-heading">Categories, budgets & deadlines</h3><p className="mt-1 text-xs leading-relaxed text-ink/50">Applies to new tasks. Existing tasks and payments are left untouched.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-ink/70">Minimum budget<input type="number" min={1} max={100000} className={inputClass} value={marketplace.minTaskBudget} onChange={(e) => setMarketplace({ ...marketplace, minTaskBudget: Number(e.target.value) })} /></label>
            <label className="text-sm font-medium text-ink/70">Maximum budget<input type="number" min={1000} max={5000000} className={inputClass} value={marketplace.maxTaskBudget} onChange={(e) => setMarketplace({ ...marketplace, maxTaskBudget: Number(e.target.value) })} /></label>
            <label className="text-sm font-medium text-ink/70">Minimum active time · hours<input type="number" min={1} max={72} className={inputClass} value={marketplace.minTaskLifetimeHours} onChange={(e) => setMarketplace({ ...marketplace, minTaskLifetimeHours: Number(e.target.value) })} /></label>
            <label className="text-sm font-medium text-ink/70">Maximum active time · days<input type="number" min={1} max={90} className={inputClass} value={marketplace.maxTaskLifetimeDays} onChange={(e) => setMarketplace({ ...marketplace, maxTaskLifetimeDays: Number(e.target.value) })} /></label>
            <label className="text-sm font-medium text-ink/70">Default currency<select className={inputClass} value={marketplace.defaultCurrency} onChange={(e) => setMarketplace({ ...marketplace, defaultCurrency: e.target.value })}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.label}</option>)}</select></label>
          </div>
          <div className="mt-5">
            <p className="text-sm font-semibold text-ink/75">Task & service categories</p>
            <p className="mt-0.5 text-xs text-ink/45">At least one must remain active. Existing listings stay visible.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {CATEGORIES.map((category) => {
                const enabled = marketplace.enabledCategories.includes(category.value);
                const label = marketplace.categoryLabels.find((item) => item.value === category.value)?.label || category.label;
                return <div key={category.value} className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${enabled ? "border-green-700/25 bg-green-700/5" : "border-line bg-paper/50 opacity-70"}`}>
                  <input aria-label={`Enable ${label}`} type="checkbox" checked={enabled} onChange={() => setMarketplace({ ...marketplace, enabledCategories: enabled ? marketplace.enabledCategories.filter((c) => c !== category.value) : [...marketplace.enabledCategories, category.value] })} className="h-4 w-4 shrink-0 accent-green-800" />
                  <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">{category.value}</p><input aria-label={`${category.label} display label`} maxLength={40} value={label} onChange={(e) => setMarketplace({ ...marketplace, categoryLabels: marketplace.categoryLabels.map((item) => item.value === category.value ? { ...item, label: e.target.value } : item) })} className="w-full border-b border-line bg-transparent py-1 text-sm text-ink outline-none focus:border-green-700" /></div>
                </div>;
              })}
            </div>
          </div>
          <button type="button" disabled={!!saving} onClick={() => void save("marketplace")} className="mt-5 w-full rounded-full bg-green-900 px-5 py-3 text-sm font-semibold text-cream shadow-lux-sm transition hover:bg-green-800 disabled:opacity-50">{saving === "marketplace" ? "Saving…" : "Save marketplace rules"}</button>
        </section>
      </div>

      <section className="card-lux rounded-2xl p-5 sm:p-6">
        <div className="mb-5"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">03 · AI feature controls</p><h3 className="mt-1 font-display text-xl text-heading">Pause or resume AI assistance</h3><p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink/50">These switches only control optional AI assistance. Manual task posting, manual proposals and human review remain available. API keys and model choices stay outside the Admin editor.</p></div>
        <div className="grid gap-3 md:grid-cols-3">
          {([
            ["taskCopilotEnabled", "Task-writing copilot", "Draft a clearer task from a short idea."],
            ["proposalCopilotEnabled", "Proposal-writing copilot", "Help providers draft an editable proposal."],
            ["proofAssistEnabled", "Proof review assistant", "Offer an advisory proof check; never the final decision."],
          ] as const).map(([key, title, description]) => (
            <label key={key} className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-line bg-paper/45 p-4 transition hover:border-green-800/25">
              <span className="min-w-0"><span className="block text-sm font-semibold text-heading">{title}</span><span className="mt-1 block text-xs leading-relaxed text-ink/50">{description}</span><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${aiFeatures[key] ? "bg-green-800/10 text-green-800 dark:bg-green-500/15 dark:text-green-300" : "bg-ink/5 text-ink/45"}`}>{aiFeatures[key] ? "Enabled" : "Paused"}</span></span>
              <input type="checkbox" checked={aiFeatures[key]} onChange={(event) => setAiFeatures({ ...aiFeatures, [key]: event.target.checked })} aria-label={`${title} ${aiFeatures[key] ? "enabled" : "paused"}`} className="mt-1 h-5 w-5 shrink-0 accent-green-800" />
            </label>
          ))}
        </div>
        <button type="button" disabled={!!saving} onClick={() => void save("aiFeatures")} className="mt-5 w-full rounded-full bg-green-900 px-5 py-3 text-sm font-semibold text-cream shadow-lux-sm transition hover:bg-green-800 disabled:opacity-50">{saving === "aiFeatures" ? "Saving…" : "Save AI controls"}</button>
      </section>

      <section className="card-lux rounded-2xl p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">04 · Change history</p><h3 className="mt-1 font-display text-xl text-heading">Recent admin edits</h3></div><span className="text-xs text-ink/40">Latest 20 · append-only history</span></div>
        {audit.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-sm text-ink/45">No settings changed yet. Your first save will appear here.</p> : <div className="mt-4 divide-y divide-line">{audit.map((entry) => {
          const changed = Object.keys(entry.afterValue).filter((key) => JSON.stringify(entry.beforeValue[key]) !== JSON.stringify(entry.afterValue[key]));
          return <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0"><span className="font-semibold text-heading">{entry.section === "siteContent" ? "Site content" : entry.section === "commission" ? "Commission rate" : entry.section === "aiFeatures" ? "AI feature controls" : "Marketplace policy"}</span><span className="ml-2 text-xs text-ink/40">by {entry.actorId.slice(0, 8)}</span><p className="mt-1 truncate text-xs text-ink/45">Changed: {changed.join(", ") || "No value changes"}</p></div>
            <div className="flex items-center gap-3"><time className="text-xs text-ink/45" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time><button type="button" disabled={!!saving} onClick={() => void restore(entry)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink/65 hover:border-gold-500/50 hover:text-gold-600 disabled:opacity-40">Restore previous</button></div>
          </div>;
        })}</div>}
      </section>
    </div>
  );
}
