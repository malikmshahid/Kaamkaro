-- Admin Control Center: safe, typed-editable site and marketplace settings.
-- Commission remains in its existing scalar column. Secrets and money ledgers
-- deliberately do not enter this settings store.
ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS site_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS marketplace_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS admin_config_audit (
  id text PRIMARY KEY,
  actor_id text NOT NULL,
  section text NOT NULL,
  before_value jsonb NOT NULL,
  after_value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_config_audit_created_at_idx
  ON admin_config_audit (created_at DESC);
