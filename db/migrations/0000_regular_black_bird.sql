-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"posted_by_id" text NOT NULL,
	"posted_by_type" text DEFAULT 'human' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"budget" real NOT NULL,
	"city" text,
	"status" text DEFAULT 'open' NOT NULL,
	"assigned_provider_id" text,
	"proof_url" text,
	"verification_status" text DEFAULT 'not_run' NOT NULL,
	"verification_notes" text,
	"verification_confidence" real,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"source_tool_id" text,
	"currency" text DEFAULT 'PKR' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"agent_name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_hash_key" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'both' NOT NULL,
	"city" text,
	"cnic_verified" boolean DEFAULT false NOT NULL,
	"bio" text,
	"skills" text,
	"hourly_rate" real,
	"rating_avg" real DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"email" text,
	"country" text,
	"id_type" text,
	"id_number" text,
	"preferred_currency" text DEFAULT 'PKR' NOT NULL,
	"referral_code" text,
	"referred_by" text,
	CONSTRAINT "users_phone_key" UNIQUE("phone"),
	CONSTRAINT "users_email_key" UNIQUE("email"),
	CONSTRAINT "users_referral_code_key" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"reviewer_id" text NOT NULL,
	"reviewee_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"task_id" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"price" real NOT NULL,
	"delivery_days" integer DEFAULT 1 NOT NULL,
	"city" text,
	"status" text DEFAULT 'active' NOT NULL,
	"order_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"currency" text DEFAULT 'PKR' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "password_resets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_resets_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "saved_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"payer_id" text NOT NULL,
	"payee_id" text,
	"amount" real NOT NULL,
	"provider" text DEFAULT 'mock' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_ref" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"released_at" timestamp,
	"currency" text DEFAULT 'PKR' NOT NULL,
	"commission_rate_percent" real DEFAULT 0 NOT NULL,
	"commission_amount" real DEFAULT 0 NOT NULL,
	"net_payout_amount" real DEFAULT 0 NOT NULL,
	CONSTRAINT "payments_task_id_key" UNIQUE("task_id")
);
--> statement-breakpoint
CREATE TABLE "platform_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"commission_rate_percent" real DEFAULT 10 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);

*/