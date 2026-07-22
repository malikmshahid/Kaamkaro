import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL env var zaroori hai. Neon.tech (free tier) se ek Postgres database banayein, " +
      "connection string copy karein, aur .env.local mein DATABASE_URL=... daalein."
  );
}

// node-postgres works with any standard Postgres provider — Neon, Supabase,
// Railway, or a self-hosted instance — not just one vendor's proprietary driver.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
