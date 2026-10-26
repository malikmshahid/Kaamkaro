-- KaamKaro — schema alignment / repair migration
-- Generated from db/schema.ts. Idempotent: safe to run on the live DB any number of times.
-- Fixes drift from db/setup.sql / db/fix-everything.sql (which never created messages.is_read etc.)
-- Run in Neon SQL editor (or: psql $DATABASE_URL -f this_file.sql)

CREATE TABLE IF NOT EXISTS "tools" (
  "id" text PRIMARY KEY,
  "provider_id" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL,
  "price" real NOT NULL,
  "currency" text DEFAULT 'PKR' NOT NULL,
  "delivery_days" integer DEFAULT 1 NOT NULL,
  "city" text,
  "status" text DEFAULT 'active' NOT NULL,
  "order_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "provider_id" text;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "price" real;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'PKR' NOT NULL;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "delivery_days" integer DEFAULT 1 NOT NULL;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "order_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "tools" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY,
  "name" text NOT NULL,
  "phone" text,
  "email" text,
  "password_hash" text NOT NULL,
  "role" text DEFAULT 'both' NOT NULL,
  "city" text,
  "country" text,
  "id_type" text,
  "id_number" text,
  "cnic_verified" boolean DEFAULT false NOT NULL,
  "preferred_currency" text DEFAULT 'PKR' NOT NULL,
  "referral_code" text,
  "referred_by" text,
  "bio" text,
  "skills" text,
  "hourly_rate" real,
  "rating_avg" real DEFAULT 0 NOT NULL,
  "rating_count" integer DEFAULT 0 NOT NULL,
  "email_verified" boolean DEFAULT false NOT NULL,
  "email_otp_hash" text,
  "email_otp_expires_at" timestamp,
  "gender" text,
  "address" text,
  "photo_url" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'both' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_type" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "id_number" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cnic_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_currency" text DEFAULT 'PKR' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referral_code" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "referred_by" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "skills" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hourly_rate" real;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rating_avg" real DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rating_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_otp_hash" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_otp_expires_at" timestamp;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gender" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "photo_url" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "tasks" (
  "id" text PRIMARY KEY,
  "posted_by_id" text NOT NULL,
  "posted_by_type" text DEFAULT 'human' NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "category" text NOT NULL,
  "budget" real NOT NULL,
  "currency" text DEFAULT 'PKR' NOT NULL,
  "city" text,
  "status" text DEFAULT 'open' NOT NULL,
  "assigned_provider_id" text,
  "assigned_provider_type" text DEFAULT 'human' NOT NULL,
  "proof_url" text,
  "source_tool_id" text,
  "verification_status" text DEFAULT 'not_run' NOT NULL,
  "verification_notes" text,
  "verification_confidence" real,
  "verified_at" timestamp,
  "expires_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "posted_by_id" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "posted_by_type" text DEFAULT 'human' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "title" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "category" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "budget" real;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'PKR' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'open' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assigned_provider_id" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "assigned_provider_type" text DEFAULT 'human' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "proof_url" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "source_tool_id" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "verification_status" text DEFAULT 'not_run' NOT NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "verification_notes" text;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "verification_confidence" real;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "verified_at" timestamp;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "applications" (
  "id" text PRIMARY KEY,
  "task_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "applicant_type" text DEFAULT 'human' NOT NULL,
  "agent_listing_id" text,
  "message" text,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "task_id" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "provider_id" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "applicant_type" text DEFAULT 'human' NOT NULL;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "agent_listing_id" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "agent_listings" (
  "id" text PRIMARY KEY,
  "api_key_id" text NOT NULL,
  "owner_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "categories" text NOT NULL,
  "price_per_task_pkr" real,
  "avg_delivery_hours" integer DEFAULT 24 NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "task_count" integer DEFAULT 0 NOT NULL,
  "rating_avg" real DEFAULT 0 NOT NULL,
  "rating_count" integer DEFAULT 0 NOT NULL,
  "auto_apply" boolean DEFAULT false NOT NULL,
  "auto_apply_min_budget_pkr" real,
  "auto_apply_max_budget_pkr" real,
  "auto_apply_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "api_key_id" text;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "owner_id" text;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "name" text;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "categories" text;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "price_per_task_pkr" real;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "avg_delivery_hours" integer DEFAULT 24 NOT NULL;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "task_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "rating_avg" real DEFAULT 0 NOT NULL;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "rating_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "auto_apply" boolean DEFAULT false NOT NULL;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "auto_apply_min_budget_pkr" real;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "auto_apply_max_budget_pkr" real;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "auto_apply_message" text;
ALTER TABLE "agent_listings" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" text PRIMARY KEY,
  "owner_id" text NOT NULL,
  "agent_name" text NOT NULL,
  "key_hash" text NOT NULL,
  "key_prefix" text NOT NULL,
  "request_count" integer DEFAULT 0 NOT NULL,
  "last_used_at" timestamp,
  "revoked" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "owner_id" text;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "agent_name" text;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "key_hash" text;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "key_prefix" text;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "request_count" integer DEFAULT 0 NOT NULL;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "last_used_at" timestamp;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "revoked" boolean DEFAULT false NOT NULL;
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "type" text NOT NULL,
  "message" text NOT NULL,
  "task_id" text,
  "read" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "message" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "task_id" text;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "read" boolean DEFAULT false NOT NULL;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "password_resets" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "token_hash" text;
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "used" boolean DEFAULT false NOT NULL;
ALTER TABLE "password_resets" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "email_change_requests" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "new_email" text NOT NULL,
  "otp_hash" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "used" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "email_change_requests" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "email_change_requests" ADD COLUMN IF NOT EXISTS "new_email" text;
ALTER TABLE "email_change_requests" ADD COLUMN IF NOT EXISTS "otp_hash" text;
ALTER TABLE "email_change_requests" ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
ALTER TABLE "email_change_requests" ADD COLUMN IF NOT EXISTS "used" boolean DEFAULT false NOT NULL;
ALTER TABLE "email_change_requests" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "messages" (
  "id" text PRIMARY KEY,
  "task_id" text NOT NULL,
  "sender_id" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "is_read" boolean DEFAULT false NOT NULL
);
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "task_id" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sender_id" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "body" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "payments" (
  "id" text PRIMARY KEY,
  "task_id" text NOT NULL,
  "payer_id" text NOT NULL,
  "payee_id" text,
  "amount" real NOT NULL,
  "currency" text DEFAULT 'PKR' NOT NULL,
  "commission_rate_percent" real DEFAULT 0 NOT NULL,
  "commission_amount" real DEFAULT 0 NOT NULL,
  "net_payout_amount" real DEFAULT 0 NOT NULL,
  "provider" text DEFAULT 'mock' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "provider_ref" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "released_at" timestamp
);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "task_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payer_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payee_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount" real;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'PKR' NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "commission_rate_percent" real DEFAULT 0 NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "commission_amount" real DEFAULT 0 NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "net_payout_amount" real DEFAULT 0 NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider" text DEFAULT 'mock' NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending' NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_ref" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "released_at" timestamp;

CREATE TABLE IF NOT EXISTS "platform_config" (
  "id" text DEFAULT 'default' PRIMARY KEY,
  "commission_rate_percent" real DEFAULT 10 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "updated_by" text
);
ALTER TABLE "platform_config" ADD COLUMN IF NOT EXISTS "commission_rate_percent" real DEFAULT 10 NOT NULL;
ALTER TABLE "platform_config" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "platform_config" ADD COLUMN IF NOT EXISTS "updated_by" text;

CREATE TABLE IF NOT EXISTS "reviews" (
  "id" text PRIMARY KEY,
  "task_id" text NOT NULL,
  "reviewer_id" text NOT NULL,
  "reviewee_id" text NOT NULL,
  "agent_listing_id" text,
  "rating" integer NOT NULL,
  "comment" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "task_id" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "reviewer_id" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "reviewee_id" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "agent_listing_id" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "rating" integer;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "comment" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;

CREATE TABLE IF NOT EXISTS "saved_items" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "item_type" text NOT NULL,
  "item_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "saved_items" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "saved_items" ADD COLUMN IF NOT EXISTS "item_type" text;
ALTER TABLE "saved_items" ADD COLUMN IF NOT EXISTS "item_id" text;
ALTER TABLE "saved_items" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
