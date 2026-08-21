-- Platform Commission System migration
-- Run after 0001, 0002, 0003 migrations.

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS commission_rate_percent real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_payout_amount real NOT NULL DEFAULT 0;

-- Backfill: for any existing released/held payments before this migration,
-- treat them as 0% commission (net payout = full amount) so historical data
-- stays consistent rather than showing 0 payout.
UPDATE payments SET net_payout_amount = amount WHERE net_payout_amount = 0;

CREATE TABLE IF NOT EXISTS platform_config (
  id text PRIMARY KEY DEFAULT 'default',
  commission_rate_percent real NOT NULL DEFAULT 10,
  updated_at timestamp NOT NULL DEFAULT now(),
  updated_by text
);

-- Seed the single config row if it doesn't exist yet. Starts at 10% — change
-- anytime from the admin panel (Admin > Revenue > Commission Rate).
INSERT INTO platform_config (id, commission_rate_percent)
VALUES ('default', 10)
ON CONFLICT (id) DO NOTHING;
