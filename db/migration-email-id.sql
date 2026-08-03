-- Migration: Email + Country + National ID support
-- Run this in Neon's SQL Editor if you already have a live database from
-- before this feature (i.e. your `users` table already exists).
-- Safe to run even if some of these already exist — each statement checks first.

DO $$
BEGIN
  -- Make phone nullable (was previously required; email is now an alternative)
  ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='email') THEN
    ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='country') THEN
    ALTER TABLE users ADD COLUMN country TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id_type') THEN
    ALTER TABLE users ADD COLUMN id_type TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='id_number') THEN
    ALTER TABLE users ADD COLUMN id_number TEXT;
  END IF;
END $$;
