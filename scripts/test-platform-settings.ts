import assert from "node:assert/strict";

// Keep this pure validation suite runnable without a live database.
process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/kaamkaro_test";

async function main() {
  const settings = await import("../lib/platformSettings");

  const marketplaceDefaults = {
  ...settings.MARKETPLACE_DEFAULTS,
  enabledCategories: [...settings.MARKETPLACE_DEFAULTS.enabledCategories],
  categoryLabels: [...settings.MARKETPLACE_DEFAULTS.categoryLabels],
};

assert.equal(settings.siteContentSchema.safeParse(settings.SITE_CONTENT_DEFAULTS).success, true, "site defaults validate");
assert.equal(settings.marketplaceSettingsSchema.safeParse(marketplaceDefaults).success, true, "marketplace defaults validate");
assert.equal(settings.aiFeaturesSchema.safeParse(settings.AI_FEATURE_DEFAULTS).success, true, "AI defaults validate");

assert.equal(
  settings.marketplaceSettingsSchema.safeParse({ ...marketplaceDefaults, minTaskBudget: 6000, maxTaskBudget: 5000 }).success,
  false,
  "minimum budget cannot equal or exceed maximum",
);
assert.equal(
  settings.marketplaceSettingsSchema.safeParse({ ...marketplaceDefaults, enabledCategories: [] }).success,
  false,
  "at least one category must remain enabled",
);
assert.equal(
  settings.siteContentSchema.safeParse({ ...settings.SITE_CONTENT_DEFAULTS, supportEmail: "not-an-email" }).success,
  false,
  "support address must be valid",
);
assert.equal(
  settings.aiFeaturesSchema.safeParse({ ...settings.AI_FEATURE_DEFAULTS, groqApiKey: "must-not-be-editable" }).success,
  false,
  "AI credentials are rejected by the strict schema",
);

  console.log("Platform settings validation: 7 assertions passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
