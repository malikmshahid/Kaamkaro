-- Optional client-defined deliverables for clearer task scope and review.
-- Existing tasks keep an empty list; no existing task data is changed.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS deliverables text[] NOT NULL DEFAULT '{}'::text[];
