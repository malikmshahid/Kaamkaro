/**
 * Canonical task/tool categories.
 *
 * Before this existed, `POST /api/tasks` accepted *any* string as a category
 * (QA sent "hacking" and it was stored happily), which meant the category
 * filter silently lost those tasks and the badges read "Home Services" in
 * lowercase machine words. Everything now validates against this one list.
 */
export const CATEGORIES = [
  { value: "delivery", label: "Delivery" },
  { value: "design", label: "Design" },
  { value: "coding", label: "Coding / IT" },
  { value: "writing", label: "Writing" },
  { value: "home", label: "Home Services" },
  { value: "verification", label: "Verification / Photo" },
  { value: "other", label: "Other" },
] as const;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];

export const CATEGORY_VALUES: string[] = CATEGORIES.map((c) => c.value);

export function isCategory(value: string): value is CategoryValue {
  return CATEGORY_VALUES.includes(value);
}

/** "home" -> "Home Services". Unknown values are title-cased instead of crashing. */
export function categoryLabel(value: string | null | undefined): string {
  if (!value) return "Other";
  const hit = CATEGORIES.find((c) => c.value === value.toLowerCase());
  if (hit) return hit.label;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Hard input limits shared by the API and the forms. */
export const LIMITS = {
  taskTitle: 120,
  taskDescription: 4000,
  taskCity: 60,
  applicationMessage: 1000,
  reviewComment: 1000,
  chatMessage: 2000,
  toolTitle: 120,
  toolDescription: 2000,
} as const;
