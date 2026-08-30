import {
  pgTable,
  text,
  real,
  integer,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

/* =========================================================================
 * KaamKaro — reconstructed db/schema.ts
 *
 * This file was rebuilt after db/schema.ts got overwritten by AI-generated
 * code that replaced the whole file instead of adding to it. It was
 * reconstructed from:
 *   - db/setup.sql, db/fix-everything.sql, db/migration-v3.sql,
 *     db/migration-email-id.sql
 *   - db/migrations/0002_agent_reviews.sql, 0004_platform_commission.sql
 *   - actual column usage across every route/page in the app (grepped)
 *
 * ⚠️ agentListings below is a best-effort reconstruction — its original
 * migration (0001_agent_marketplace.sql) was not present anywhere in the
 * project, so its exact column list/types could not be 100% confirmed
 * against SQL. Every field listed IS used somewhere in the app code, so
 * normal app queries should work, but do NOT run `drizzle-kit push`
 * against production with this file until you've verified it against
 * the live DB with `npx drizzle-kit pull` — push could try to alter a
 * live table based on a guess and cause data loss.
 * ========================================================================= */

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("both"),
  city: text("city"),
  country: text("country"),
  idType: text("id_type"),
  idNumber: text("id_number"),
  cnicVerified: boolean("cnic_verified").notNull().default(false),
  bio: text("bio"),
  skills: text("skills"),
  hourlyRate: real("hourly_rate"),
  ratingAvg: real("rating_avg").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  preferredCurrency: text("preferred_currency").notNull().default("PKR"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  postedById: text("posted_by_id").notNull(),
  postedByType: text("posted_by_type").notNull().default("human"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  budget: real("budget").notNull(),
  currency: text("currency").notNull().default("PKR"),
  city: text("city"),
  status: text("status").notNull().default("open"),
  assignedProviderId: text("assigned_provider_id"),
  assignedProviderType: text("assigned_provider_type").default("human"),
  proofUrl: text("proof_url"),
  sourceToolId: text("source_tool_id"),
  verificationStatus: text("verification_status").notNull().default("not_run"),
  verificationNotes: text("verification_notes"),
  verificationConfidence: real("verification_confidence"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  providerId: text("provider_id").notNull(),
  applicantType: text("applicant_type").notNull().default("human"),
  agentListingId: text("agent_listing_id"),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  agentName: text("agent_name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(),
  requestCount: integer("request_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  message: text("message").notNull(),
  taskId: text("task_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  senderId: text("sender_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().unique(),
  payerId: text("payer_id").notNull(),
  payeeId: text("payee_id"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("PKR"),
  provider: text("provider").notNull().default("mock"),
  status: text("status").notNull().default("pending"),
  providerRef: text("provider_ref"),
  commissionRatePercent: real("commission_rate_percent").notNull().default(0),
  commissionAmount: real("commission_amount").notNull().default(0),
  netPayoutAmount: real("net_payout_amount").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  reviewerId: text("reviewer_id").notNull(),
  revieweeId: text("reviewee_id").notNull(),
  agentListingId: text("agent_listing_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tools = pgTable("tools", {
  id: text("id").primaryKey(),
  providerId: text("provider_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("PKR"),
  deliveryDays: integer("delivery_days").notNull().default(1),
  city: text("city"),
  status: text("status").notNull().default("active"),
  orderCount: integer("order_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedItems = pgTable("saved_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemType: text("item_type").notNull(),
  itemId: text("item_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformConfig = pgTable("platform_config", {
  id: text("id").primaryKey().default("default"),
  commissionRatePercent: real("commission_rate_percent").notNull().default(10),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text("updated_by"),
});

// ⚠️ Best-effort reconstruction — see file header note. Verify with
// `npx drizzle-kit pull` before trusting this for schema migrations.
export const agentListings = pgTable("agent_listings", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  categories: text("categories"),
  pricePerTaskPkr: real("price_per_task_pkr"),
  avgDeliveryHours: real("avg_delivery_hours"),
  taskCount: integer("task_count").notNull().default(0),
  ratingAvg: real("rating_avg").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------- New table added for the forgot-password security fix ---------- */
export const passwordResetTokens = pgTable("password_resets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
