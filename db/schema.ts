import { pgTable, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Tools: provider-listed services ("gigs") — a provider proactively lists a
// fixed-price offering instead of waiting for a client to post a task.
// Ordering a tool creates a `tasks` row (linked via sourceToolId) so it reuses
// the exact same escrow/chat/verification/dispute/review pipeline as tasks.
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
  status: text("status", { enum: ["active", "paused"] }).notNull().default("active"),
  orderCount: integer("order_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Users: providers, clients, or both. AI agents also live here with a role flag.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["client", "provider", "both", "admin"] })
    .notNull()
    .default("both"),
  city: text("city"),
  country: text("country"), // ISO country name, e.g. "Pakistan"
  idType: text("id_type", { enum: ["national_id", "passport", "driver_license", "other"] }),
  idNumber: text("id_number"), // for identity verification only — never used as a login credential
  cnicVerified: boolean("cnic_verified").notNull().default(false), // repurposed as general "ID verified" flag
  preferredCurrency: text("preferred_currency").notNull().default("PKR"),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"), // another user's id, if they signed up via a referral link
  bio: text("bio"),
  skills: text("skills"), // comma-separated for MVP; move to a join table later
  hourlyRate: real("hourly_rate"),
  ratingAvg: real("rating_avg").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Tasks: postedByType distinguishes a human client from an AI agent (Phase 3).
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  postedById: text("posted_by_id").notNull(), // users.id OR an api key owner id
  postedByType: text("posted_by_type", { enum: ["human", "ai_agent"] })
    .notNull()
    .default("human"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  budget: real("budget").notNull(),
  currency: text("currency").notNull().default("PKR"),
  city: text("city"),
  status: text("status", {
    enum: ["open", "assigned", "submitted", "completed", "disputed", "cancelled"],
  })
    .notNull()
    .default("open"),
  assignedProviderId: text("assigned_provider_id"),
  assignedProviderType: text("assigned_provider_type", { enum: ["human", "ai_agent"] })
    .notNull()
    .default("human"),
  proofUrl: text("proof_url"),
  sourceToolId: text("source_tool_id"), // set when this task originated from an ordered tool/gig
  verificationStatus: text("verification_status", {
    enum: ["not_run", "pass", "review_needed", "fail", "error"],
  })
    .notNull()
    .default("not_run"),
  verificationNotes: text("verification_notes"),
  verificationConfidence: real("verification_confidence"), // 0-1
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Applications: a provider applying to an open task.
// applicantType distinguishes a human freelancer from an AI agent applying
// via its owner's API key (Agent Economy — Phase 3).
export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  providerId: text("provider_id").notNull(), // users.id — the agent owner's user id when applicantType is ai_agent
  applicantType: text("applicant_type", { enum: ["human", "ai_agent"] })
    .notNull()
    .default("human"),
  agentListingId: text("agent_listing_id"), // set when an AI agent applied — links to agentListings
  message: text("message"),
  status: text("status", { enum: ["pending", "accepted", "rejected"] })
    .notNull()
    .default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Agent Listings: an AI agent's public "seller profile" in the Agent Marketplace.
// One API key can have one public listing so it can be discovered and hired
// like a freelancer — the core Agent-to-Agent Economy differentiator.
export const agentListings = pgTable("agent_listings", {
  id: text("id").primaryKey(),
  apiKeyId: text("api_key_id").notNull().unique(),
  ownerId: text("owner_id").notNull(), // users.id — the human/business who owns this agent
  name: text("name").notNull(),
  description: text("description").notNull(),
  categories: text("categories").notNull(), // comma-separated, e.g. "writing,coding"
  pricePerTaskPkr: real("price_per_task_pkr"),
  avgDeliveryHours: integer("avg_delivery_hours").notNull().default(24),
  status: text("status", { enum: ["active", "paused"] }).notNull().default("active"),
  taskCount: integer("task_count").notNull().default(0),
  ratingAvg: real("rating_avg").notNull().default(0),
  ratingCount: integer("rating_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// API Keys: issued to a user so their AI agent can post/manage tasks programmatically.
export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(), // users.id — the human/business who owns this agent
  agentName: text("agent_name").notNull(),
  keyHash: text("key_hash").notNull().unique(),
  keyPrefix: text("key_prefix").notNull(), // shown in UI, e.g. "kk_live_ab12" — full key never stored
  requestCount: integer("request_count").notNull().default(0),
  lastUsedAt: timestamp("last_used_at"),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Notifications: lightweight in-app alerts for key events (new application,
// accepted, new message, submitted, completed, review received, dispute).
export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(), // e.g. "application_received", "task_accepted", "new_message"
  message: text("message").notNull(),
  taskId: text("task_id"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Password Resets: short-lived tokens for the forgot-password flow.
export const passwordResets = pgTable("password_resets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Messages: simple per-task chat between client and assigned provider.
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  senderId: text("sender_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Payments: escrow record per task. Provider field abstracts JazzCash/EasyPaisa/Payoneer
// so a real gateway can be plugged in later without changing the schema.
export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().unique(),
  payerId: text("payer_id").notNull(),
  payeeId: text("payee_id"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("PKR"),
  provider: text("provider", { enum: ["jazzcash", "easypaisa", "payoneer", "mock"] })
    .notNull()
    .default("mock"),
  status: text("status", {
    enum: ["pending", "held_in_escrow", "released", "refunded"],
  })
    .notNull()
    .default("pending"),
  providerRef: text("provider_ref"), // transaction id returned by the real gateway later
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  releasedAt: timestamp("released_at"),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull(),
  reviewerId: text("reviewer_id").notNull(),
  revieweeId: text("reviewee_id").notNull(),
  agentListingId: text("agent_listing_id"), // set when the reviewee was an AI agent
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Saved Items: a user bookmarking a task or a Toolbox listing to revisit later.
export const savedItems = pgTable("saved_items", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  itemType: text("item_type", { enum: ["task", "tool"] }).notNull(),
  itemId: text("item_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});
