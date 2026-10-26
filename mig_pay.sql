ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "basket_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_txn_id" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_status" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider_payload" jsonb;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paid_at" timestamptz;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payout_id" text;

CREATE TABLE IF NOT EXISTS "payment_events" (
  "id" text PRIMARY KEY,
  "payment_id" text NOT NULL,
  "kind" text NOT NULL,
  "detail" text,
  "payload" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "payment_events_payment_idx" ON "payment_events" ("payment_id");

CREATE TABLE IF NOT EXISTS "payouts" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL,
  "amount" double precision NOT NULL,
  "currency" text NOT NULL DEFAULT 'PKR',
  "method" text NOT NULL,
  "account_title" text NOT NULL,
  "account_number" text NOT NULL,
  "bank_name" text,
  "status" text NOT NULL DEFAULT 'requested',
  "reference" text,
  "note" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "processed_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "payouts_user_idx" ON "payouts" ("user_id");
CREATE INDEX IF NOT EXISTS "payouts_status_idx" ON "payouts" ("status");
