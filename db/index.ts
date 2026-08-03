import * as schema from "./schema";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL env var is required. Get a free Postgres database from Neon.tech, " +
      "copy the connection string, and set DATABASE_URL=... in .env.local."
  );
}

const isNeon = process.env.DATABASE_URL.includes("neon.tech");

/**
 * Two drivers, chosen automatically based on the connection string:
 *
 * - Neon (production): the official @neondatabase/serverless HTTP driver.
 *   This is REQUIRED when connecting through Neon's pooled (-pooler) endpoint
 *   from a serverless platform like Vercel — the standard `pg` TCP driver
 *   doesn't play well with connection poolers across serverless cold starts
 *   (prepared-statement/connection-reuse errors), which is what was causing
 *   "Something went wrong" on every write in production. The HTTP driver
 *   sidesteps that entirely.
 *
 * - Any other Postgres (local dev, Supabase, Railway, self-hosted): the
 *   standard `pg` driver, so local testing doesn't require reaching Neon's
 *   servers at all.
 */
export const db: any = isNeon
  ? drizzleNeon(neon(process.env.DATABASE_URL), { schema })
  : drizzlePg(
      new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false },
      }),
      { schema }
    );
