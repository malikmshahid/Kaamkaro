-- Admin-editable operational switches for optional AI features.
-- Secrets and model selection remain in deployment environment variables.
ALTER TABLE platform_config
  ADD COLUMN IF NOT EXISTS ai_features jsonb NOT NULL DEFAULT '{}'::jsonb;
