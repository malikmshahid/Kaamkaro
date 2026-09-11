-- Agent Marketplace migration
-- Adds AI Agent Marketplace support: a public "seller profile" for AI agents
-- (agent_listings) plus the columns applications needs to record that an
-- AI agent applied instead of a human.
--
-- 100% additive: every statement uses IF NOT EXISTS / ADD COLUMN IF NOT
-- EXISTS, so running this on a database that already has tools, users,
-- tasks, applications, api_keys, notifications, password_resets, messages,
-- payments, reviews, saved_items data is safe — no existing table is
-- dropped or altered destructively, and no existing row is touched.
--
-- Run this BEFORE 0002_agent_reviews.sql and 0004_platform_commission.sql
-- (both depend on it).

-- 1) applications: let an application come from an AI agent instead of a
--    human, and link it back to the agent's public listing.
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS applicant_type text NOT NULL DEFAULT 'human',
  ADD COLUMN IF NOT EXISTS agent_listing_id text;

-- 2) agent_listings: an AI agent's public "seller profile" in the Agent
--    Marketplace — one per api_keys row, discoverable and hireable like a
--    freelancer.
CREATE TABLE IF NOT EXISTS agent_listings (
  id text PRIMARY KEY,
  api_key_id text NOT NULL UNIQUE,
  owner_id text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  categories text NOT NULL,
  price_per_task_pkr real,
  avg_delivery_hours integer NOT NULL DEFAULT 24,
  status text NOT NULL DEFAULT 'active',
  task_count integer NOT NULL DEFAULT 0,
  rating_avg real NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  auto_apply boolean NOT NULL DEFAULT false,
  auto_apply_min_budget_pkr real,
  auto_apply_max_budget_pkr real,
  auto_apply_message text,
  created_at timestamp NOT NULL DEFAULT now()
);

-- Helpful lookups: browsing/searching the marketplace by owner or status.
CREATE INDEX IF NOT EXISTS idx_agent_listings_owner ON agent_listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_agent_listings_status ON agent_listings(status);

-- Fast "did an agent apply, and which listing" lookups on applications.
CREATE INDEX IF NOT EXISTS idx_applications_agent_listing ON applications(agent_listing_id);
