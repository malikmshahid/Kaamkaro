import { db } from "@/db";
import { platformConfig } from "@/db/schema";
import { CATEGORIES } from "@/lib/constants";
import { CURRENCIES } from "@/lib/currency";
import { eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { z } from "zod";

export const SITE_CONTENT_DEFAULTS = {
  heroEyebrow: "Clear scope · work worldwide",
  heroLineOne: "Work starts here.",
  heroAccent: "Anywhere",
  heroLineTwo: "with clarity.",
  heroSubheading:
    "A marketplace for local and digital work. Share what you need, compare proposals and review deliverables against a clear brief. Optional AI assists; people stay in control.",
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
  trustPoints: [
    "No signup fee, no monthly plan",
    "Review the work before marking it complete",
    "AI proof assistance when enabled; people decide",
    "Works for AI agents too (API keys)",
  ],
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

export const AI_FEATURE_DEFAULTS = {
  taskCopilotEnabled: true,
  proposalCopilotEnabled: true,
  proofAssistEnabled: true,
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
  howItWorksEyebrow: plainText(60),
  howItWorksTitle: plainText(120),
  howItWorksSteps: z.array(z.object({ title: plainText(80), body: plainText(340) }).strict()).length(3),
  aiSectionEyebrow: plainText(60),
  aiSectionTitle: plainText(120),
  aiSectionBody: plainText(300),
  trustSectionEyebrow: plainText(60),
  trustSectionTitle: plainText(120),
  trustSectionBody: plainText(260),
  trustChecks: z.array(z.object({ title: plainText(90), body: plainText(260) }).strict()).length(3),
  footerDescription: plainText(240),
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

export const aiFeaturesSchema = z.object({
  taskCopilotEnabled: z.boolean(),
  proposalCopilotEnabled: z.boolean(),
  proofAssistEnabled: z.boolean(),
}).strict();

export type SiteContent = z.infer<typeof siteContentSchema>;
export type MarketplaceSettings = z.infer<typeof marketplaceSettingsSchema>;
export type AiFeatures = z.infer<typeof aiFeaturesSchema>;
export type PlatformSettings = { siteContent: SiteContent; marketplace: MarketplaceSettings; aiFeatures: AiFeatures };

function mergeValid<T extends Record<string, unknown>>(schema: z.ZodType<T>, defaults: T, stored: unknown): T {
  const candidate = stored && typeof stored === "object" && !Array.isArray(stored)
    ? { ...defaults, ...(stored as Record<string, unknown>) }
    : defaults;
  const parsed = schema.safeParse(candidate);
  return parsed.success ? parsed.data : defaults;
}

const readStoredPlatformSettings = unstable_cache(
  async () => {
    const [row] = await db
      .select({
        siteContent: platformConfig.siteContent,
        marketplaceSettings: platformConfig.marketplaceSettings,
        aiFeatures: platformConfig.aiFeatures,
      })
      .from(platformConfig)
      .where(eq(platformConfig.id, "default"))
      .limit(1);
    return row ?? null;
  },
  ["kaamkaro-platform-settings-v1"],
  { revalidate: 60, tags: ["platform-settings"] },
);

function migrateLegacySiteCopy(siteContent: SiteContent): SiteContent {
  const legacyText: Record<string, string> = {
    "Clear scope · PKR first": "Clear scope · work worldwide",
    "Post the work.": "Work starts here.",
    Pakistan: "Anywhere",
    "gets it done.": "with clarity.",
    "A marketplace for local work: share what you need, compare real provider proposals and review the work against a clear brief. Optional AI assistance helps reduce the guesswork; people stay in control.":
      "A marketplace for local and digital work. Share what you need, compare proposals and review deliverables against a clear brief. Optional AI assists; people stay in control.",
    "A marketplace for real work in Pakistan—clear briefs, useful AI assistance and people in control from start to finish.":
      "A marketplace for local and digital work—clear briefs, useful AI assistance and people in control from start to finish.",
    "Post the work. Get it done today.": "Start good work, anywhere.",
    "Free to post. Clear expectations, optional AI assistance and human review. Built in Pakistan, for Pakistan.":
      "Free to post. Clear expectations, optional AI assistance and human review. Rooted in Pakistan, open to the world.",
  };
  const migrated = { ...siteContent };
  for (const key of ["heroEyebrow", "heroLineOne", "heroAccent", "heroLineTwo", "heroSubheading", "footerDescription", "closingTitle", "closingBody"] as const) {
    const value = migrated[key];
    if (value in legacyText) migrated[key] = legacyText[value];
  }
  migrated.faqs = migrated.faqs.map((faq) =>
    faq.question === "Can I hire from outside Pakistan?" && faq.answer === "Yes — the platform is PKR-first but supports other currencies, so overseas clients can post work for Pakistani providers."
      ? {
          question: "Can people use SafarWorks from outside Pakistan?",
          answer: "SafarWorks is designed for clients and providers in multiple markets. Available currencies, task categories and payment options can vary by region and task; check the terms shown before committing.",
        }
      : faq,
  );
  return migrated;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const row = await readStoredPlatformSettings();
    return {
      siteContent: migrateLegacySiteCopy(mergeValid(siteContentSchema, { ...SITE_CONTENT_DEFAULTS }, row?.siteContent)),
      marketplace: mergeValid(marketplaceSettingsSchema, { ...MARKETPLACE_DEFAULTS, enabledCategories: [...MARKETPLACE_DEFAULTS.enabledCategories] }, row?.marketplaceSettings),
      aiFeatures: mergeValid(aiFeaturesSchema, { ...AI_FEATURE_DEFAULTS }, row?.aiFeatures),
    };
  } catch {
    // A missing/momentarily unavailable settings row never takes down task
    // creation or the landing page; static defaults are conservative.
    return {
      siteContent: { ...SITE_CONTENT_DEFAULTS },
      marketplace: { ...MARKETPLACE_DEFAULTS, enabledCategories: [...MARKETPLACE_DEFAULTS.enabledCategories] },
      aiFeatures: { ...AI_FEATURE_DEFAULTS },
    };
  }
}

export function publicSettingsPayload(settings: PlatformSettings) {
  const categoryLabels = Object.fromEntries(settings.marketplace.categoryLabels.map((item) => [item.value, item.label]));
  return {
    siteContent: settings.siteContent,
    marketplace: settings.marketplace,
    aiFeatures: settings.aiFeatures,
    categoryLabels,
    categories: CATEGORIES.filter((category) => settings.marketplace.enabledCategories.includes(category.value))
      .map((category) => ({ ...category, label: categoryLabels[category.value] || category.label })),
    currencies: CURRENCIES,
  };
}
