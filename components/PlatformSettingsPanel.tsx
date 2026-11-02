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
type AuditEntry = {
  id: string;
  actorId: string;
  section: string;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
  createdAt: string;
};
const inputClass = "mt-1.5 w-full rounded-xl border border-line bg-paper/60 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-700/20";
const defaultSite: SiteContent = {
  heroEyebrow: "Escrow protected · PKR first",
  heroLineOne: "Post the work.",
  heroAccent: "Pakistan",
  heroLineTwo: "gets it done.",
  heroSubheading: "A real marketplace for local work: post a task, or order a ready-made service from a verified provider. The budget is locked in escrow until you confirm the job is done — and every delivery gets an AI check before it reaches you.",
  primaryCta: "Post a task — free",
  secondaryCta: "Browse open tasks",
  supportEmail: "support@kaamkaro.ai",
  trustPoints: ["No signup fee, no monthly plan", "Payment released only when you confirm", "AI-checked proof on every delivery", "Works for AI agents too (API keys)"],
  categorySectionEyebrow: "What gets done here",
  categorySectionTitle: "kinds of work, one place",
  faqEyebrow: "Straight answers",
  faqTitle: "Questions people actually ask",
  closingEyebrow: "Start in two minutes",
  closingTitle: "Post the work. Get it done today.",
  closingBody: "Free to post. Escrow protected. AI-checked. Built in Pakistan, for Pakistan.",
  closingPrimaryCta: "Create a free account",
  closingSecondaryCta: "Browse tasks first",
  faqs: [
    { question: "When exactly does the provider get paid?", answer: "The moment you press confirm. The client's budget is held by KaamKaro from the time a provider is assigned, so the money is already guaranteed — it simply moves to the provider after your approval." },
    { question: "What if the work is wrong or fake?", answer: "Don't confirm. Open a dispute and an admin reviews the proof, the chat and the AI verdict, then decides whether to release or refund. Submissions that match an earlier task byte-for-byte are flagged automatically." },
    { question: "What does KaamKaro charge?", answer: "Posting is free. A flat commission is deducted from the provider's payout on completed tasks, and it is shown in full before work begins — no hidden bidding credits, no connects." },
    { question: "Do I need a bank account?", answer: "No. You can sign up with just a phone number. Wallet and card payouts are being rolled out; until then payouts are recorded in the app and settled by the team." },
    { question: "Can I hire from outside Pakistan?", answer: "Yes — the platform is PKR-first but supports other currencies, so overseas clients can post work for Pakistani providers." },
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
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"siteContent" | "marketplace" | "commission" | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load settings.");
      setSite({ ...defaultSite, ...data.settings.siteContent });
      setMarketplace({ ...defaultMarketplace, ...data.settings.marketplace });
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
    const section = entry.section === "siteContent" || entry.section === "marketplace" || entry.section === "commission" ? entry.section : null;
    if (!section) return;
    const label = section === "siteContent" ? "site content" : section === "marketplace" ? "marketplace settings" : "commission rate";
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

  async function save(section: "siteContent" | "marketplace") {
    setSaving(section);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, value: section === "siteContent" ? site : marketplace }),
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
      {key === "heroSubheading" || key === "closingBody" ? (
        <textarea rows={key === "heroSubheading" ? 4 : 3} maxLength={key === "heroSubheading" ? 420 : 320} className={inputClass} value={site[key]} onChange={(e) => setSite({ ...site, [key]: e.target.value })} />
      ) : (
        <input type={key === "supportEmail" ? "email" : "text"} maxLength={key === "heroEyebrow" ? 80 : key === "primaryCta" || key === "secondaryCta" || key === "closingPrimaryCta" || key === "closingSecondaryCta" ? 44 : 120} className={inputClass} value={site[key] as string} onChange={(e) => setSite({ ...site, [key]: e.target.value })} />
      )}
      {(key === "heroSubheading" || key === "closingBody") && <span className="mt-1 block text-right text-[11px] font-normal text-ink/40">{(site[key] as string).length}/{key === "heroSubheading" ? 420 : 320}</span>}
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
            <div className="grid gap-3 sm:grid-cols-2">{textField("categorySectionEyebrow", "Category section eyebrow")}{textField("categorySectionTitle", "Category section title")}{textField("faqEyebrow", "FAQ eyebrow")}{textField("faqTitle", "FAQ title")}</div>
            <div className="rounded-xl border border-line bg-paper/40 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-heading">Homepage FAQ</p><p className="mt-0.5 text-xs text-ink/45">3–8 entries; each answer up to 650 characters.</p></div><button type="button" disabled={site.faqs.length >= 8} onClick={() => setSite({ ...site, faqs: [...site.faqs, { question: "New question", answer: "Add a clear answer." }] })} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink/60 disabled:opacity-40">+ Add FAQ</button></div>
              <div className="mt-3 space-y-3">{site.faqs.map((faq, index) => <div key={index} className="rounded-xl border border-line bg-card p-3"><div className="flex items-center gap-2"><input aria-label={`FAQ question ${index + 1}`} maxLength={160} className={inputClass + " mt-0"} value={faq.question} onChange={(e) => setSite({ ...site, faqs: site.faqs.map((item, i) => i === index ? { ...item, question: e.target.value } : item) })} /><button type="button" aria-label="Remove FAQ" disabled={site.faqs.length <= 3} onClick={() => setSite({ ...site, faqs: site.faqs.filter((_, i) => i !== index) })} className="rounded-lg px-2 py-2 text-ink/40 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30">×</button></div><textarea aria-label={`FAQ answer ${index + 1}`} rows={3} maxLength={650} className={inputClass} value={faq.answer} onChange={(e) => setSite({ ...site, faqs: site.faqs.map((item, i) => i === index ? { ...item, answer: e.target.value } : item) })} /></div>)}</div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">{textField("closingEyebrow", "Final section eyebrow")}{textField("closingTitle", "Final section headline")}{textField("closingBody", "Final section description")}{textField("closingPrimaryCta", "Final primary button")}{textField("closingSecondaryCta", "Final secondary button")}</div>
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
        <div className="flex flex-wrap items-baseline justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">03 · Change history</p><h3 className="mt-1 font-display text-xl text-heading">Recent admin edits</h3></div><span className="text-xs text-ink/40">Latest 20 · append-only history</span></div>
        {audit.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-sm text-ink/45">No settings changed yet. Your first save will appear here.</p> : <div className="mt-4 divide-y divide-line">{audit.map((entry) => {
          const changed = Object.keys(entry.afterValue).filter((key) => JSON.stringify(entry.beforeValue[key]) !== JSON.stringify(entry.afterValue[key]));
          return <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0"><span className="font-semibold text-heading">{entry.section === "siteContent" ? "Site content" : entry.section === "commission" ? "Commission rate" : "Marketplace policy"}</span><span className="ml-2 text-xs text-ink/40">by {entry.actorId.slice(0, 8)}</span><p className="mt-1 truncate text-xs text-ink/45">Changed: {changed.join(", ") || "No value changes"}</p></div>
            <div className="flex items-center gap-3"><time className="text-xs text-ink/45" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString()}</time><button type="button" disabled={!!saving} onClick={() => void restore(entry)} className="rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-ink/65 hover:border-gold-500/50 hover:text-gold-600 disabled:opacity-40">Restore previous</button></div>
          </div>;
        })}</div>}
      </section>
    </div>
  );
}
