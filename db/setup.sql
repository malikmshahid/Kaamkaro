-- KaamKaro.ai — Initial database setup
-- Neon SQL Editor mein isay paste karke "Run" dabayein

CREATE TABLE IF NOT EXISTS tools (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  delivery_days INTEGER NOT NULL DEFAULT 1,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  order_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'both',
  city TEXT,
  cnic_verified BOOLEAN NOT NULL DEFAULT false,
  bio TEXT,
  skills TEXT,
  hourly_rate REAL,
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  posted_by_id TEXT NOT NULL,
  posted_by_type TEXT NOT NULL DEFAULT 'human',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  budget REAL NOT NULL,
  city TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_provider_id TEXT,
  proof_url TEXT,
  source_tool_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'not_run',
  verification_notes TEXT,
  verification_confidence REAL,
  verified_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  payer_id TEXT NOT NULL,
  payee_id TEXT,
  amount REAL NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mock',
  status TEXT NOT NULL DEFAULT 'pending',
  provider_ref TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  released_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  reviewee_id TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
