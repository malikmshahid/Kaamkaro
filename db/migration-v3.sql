-- Migration: Multi-currency + Saved Items + Referral Program
-- Run this in Neon's SQL Editor. Safe to run even if some parts already exist.

CREATE TABLE IF NOT EXISTS saved_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'PKR';
ALTER TABLE tools ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'PKR';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'PKR';

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_currency TEXT NOT NULL DEFAULT 'PKR';
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by TEXT;

-- Backfill referral codes for any existing users who don't have one yet
UPDATE users
SET referral_code = UPPER(SUBSTRING(MD5(id || random()::text), 1, 8))
WHERE referral_code IS NULL;
