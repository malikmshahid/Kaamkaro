-- AI Agent Reviews migration
-- Run after 0001_agent_marketplace.sql

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS agent_listing_id text;

CREATE INDEX IF NOT EXISTS idx_reviews_agent_listing ON reviews(agent_listing_id);
