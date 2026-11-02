import { db } from "@/db";
import { platformConfig } from "@/db/schema";
import { CATEGORIES } from "@/lib/constants";
import { CURRENCIES } from "@/lib/currency";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const SITE_CONTENT_DEFAULTS = {
  heroEyebrow: "Escrow protected · PKR first",
  heroLineOne: "Post the work.",
  heroAccent: "Pakistan",
  heroLineTwo: "gets it done.",
  heroSubheading:
    "A real marketplace for local work: post a task, or order a ready-made service from a verified provider. The budget is locked in escrow until you confirm the job is done — and every delivery gets an AI check before it reaches you.",
  primaryCta: "Post a task — free",
  secondaryCta: "Browse open tasks",
  supportEmail: "support@kaamkaro.ai",
  trustPoints: [
    "No signup fee, no monthly plan",
    "Payment released only when you confirm",
    "AI-checked proof on every delivery",
    "Works for AI agents too (API keys)",
  ],
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

export const MARKETPLACE_DEFAULTS = {
  minTaskBudget: 100,
  maxTaskBudget: 5_000_000,
  minTaskLifetimeHours: 1,
  maxTaskLifetimeDays: 90,
  defaultCurrency: "PKR",
  enabledCategories: CATEGORIES.map((c) => c.value),
  categoryLabels: CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
} as const;

const plainText = (max: number) => z.string().trim().min(1).max(max);
export const siteContentSchema = z.object({
  heroEyebrow: plainText(80),
  heroLineOne: plainText(60),
  heroAccent: plainText(40),
  heroLineTwo: plainText(60),
  heroSubheading: plainText(420),
  primaryCta: plainText(44),
  secondaryCta: plainText(44),
  supportEmail: z.string().trim().email().max(120),
  trustPoints: z.array(plainText(100)).min(2).max(6),
  categorySectionEyebrow: plainText(60),
  categorySectionTitle: plainText(100),
  faqEyebrow: plainText(60),
  faqTitle: plainText(100),
  closingEyebrow: plainText(60),
  closingTitle: plainText(120),
  closingBody: plainText(320),
  closingPrimaryCta: plainText(44),
  closingSecondaryCta: plainText(44),
  faqs: z.array(z.object({ question: plainText(160), answer: plainText(650) }).strict()).min(3).max(8),
}).strict();

const categoryValues = CATEGORIES.map((c) => c.value) as [string, ...string[]];
const currencyValues = CURRENCIES.map((c) => c.code) as [string, ...string[]];
export const marketplaceSettingsSchema = z.object({
  minTaskBudget: z.number().int().min(1).max(100_000),
  maxTaskBudget: z.number().int().min(1_000).max(5_000_000),
  minTaskLifetimeHours: z.number().int().min(1).max(72),
  maxTaskLifetimeDays: z.number().int().min(1).max(90),
  defaultCurrency: z.enum(currencyValues),
  enabledCategories: z.array(z.enum(categoryValues)).min(1).max(CATEGORIES.length),
  categoryLabels: z.array(z.object({ value: z.enum(categoryValues), label: plainText(40) }).strict()).length(CATEGORIES.length),
}).strict().superRefine((value, ctx) => {
  if (value.minTaskBudget >= value.maxTaskBudget) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["minTaskBudget"], message: "Minimum budget must be lower than maximum budget." });
  }
  if (value.minTaskLifetimeHours > value.maxTaskLifetimeDays * 24) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["minTaskLifetimeHours"], message: "Minimum task lifetime cannot exceed the maximum lifetime." });
  }
  if (new Set(value.categoryLabels.map((item) => item.value)).size !== CATEGORIES.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["categoryLabels"], message: "Keep exactly one label for every built-in category." });
  }
});

export type SiteContent = z.infer<typeof siteContentSchema>;
export type MarketplaceSettings = z.infer<typeof marketplaceSettingsSchema>;
export type PlatformSettings = { siteContent: SiteContent; marketplace: MarketplaceSettings };

function mergeValid<T extends Record<string, unknown>>(schema: z.ZodType<T>, defaults: T, stored: unknown): T {
  const candidate = stored && typeof stored === "object" && !Array.isArray(stored)
    ? { ...defaults, ...(stored as Record<string, unknown>) }
    : defaults;
  const parsed = schema.safeParse(candidate);
  return parsed.success ? parsed.data : defaults;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const [row] = await db.select({ siteContent: platformConfig.siteContent, marketplaceSettings: platformConfig.marketplaceSettings })
      .from(platformConfig).where(eq(platformConfig.id, "default")).limit(1);
    return {
      siteContent: mergeValid(siteContentSchema, { ...SITE_CONTENT_DEFAULTS }, row?.siteContent),
      marketplace: mergeValid(marketplaceSettingsSchema, { ...MARKETPLACE_DEFAULTS, enabledCategories: [...MARKETPLACE_DEFAULTS.enabledCategories] }, row?.marketplaceSettings),
    };
  } catch {
    // A missing/momentarily unavailable settings row never takes down task
    // creation or the landing page; static defaults are conservative.
    return {
      siteContent: { ...SITE_CONTENT_DEFAULTS },
      marketplace: { ...MARKETPLACE_DEFAULTS, enabledCategories: [...MARKETPLACE_DEFAULTS.enabledCategories] },
    };
  }
}

export function publicSettingsPayload(settings: PlatformSettings) {
  const categoryLabels = Object.fromEntries(settings.marketplace.categoryLabels.map((item) => [item.value, item.label]));
  return {
    siteContent: settings.siteContent,
    marketplace: settings.marketplace,
    categoryLabels,
    categories: CATEGORIES.filter((category) => settings.marketplace.enabledCategories.includes(category.value))
      .map((category) => ({ ...category, label: categoryLabels[category.value] || category.label })),
    currencies: CURRENCIES,
  };
}
