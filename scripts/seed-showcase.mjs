/**
 * Showcase seeder — fills the Find Work board with realistic demo tasks so the
 * marketplace doesn't look abandoned before real users arrive.
 *
 *   node scripts/seed-showcase.mjs          # create (idempotent-ish: skips if already there)
 *   node scripts/seed-showcase.mjs --clear  # remove every demo row again
 *
 * Everything it creates lives under one client account named "KaamKaro Demo"
 * plus two demo provider accounts, so nothing is ever attributed to a real user.
 * All demo rows are tagged in the description footer-free way: the client
 * account itself is the marker.
 */
import { Pool } from "pg";
import fs from "fs";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const envPath = new URL("../.env", import.meta.url);
const url = fs.readFileSync(envPath, "utf8").match(/DATABASE_URL=(.*)/)?.[1]?.trim();
if (!url) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const q = (text, params) => pool.query(text, params);

const CLIENT_EMAIL = "demo.client@kaamkaro.local";
const PROVIDERS = ["demo.p1@kaamkaro.local", "demo.p2@kaamkaro.local"];

const TASKS = [
  ["Deliver a birthday cake from Gulberg bakery to DHA Phase 5", "Cake will be ready at 4pm. Pick it up, keep it level on the bike, and hand it to the guard at the gate. Share a photo when delivered.", "delivery", 800, "Lahore", 0.2, 3],
  ["Design a logo for my clothing brand", "Streetwear brand, name is 'Roshni'. Need a clean wordmark plus a square version for Instagram. Two revisions included.", "design", 6000, "Karachi", 2, 5],
  ["Build a simple 3-section landing page in Next.js", "Sections: hero, features, contact form. No backend needed, just a clean responsive page I can deploy on Vercel.", "coding", 15000, null, 5, 7],
  ["AC service and gas refill for a 1.5 ton split unit", "Unit is cooling poorly and making noise. Need coil cleaning plus gas top-up. Ground floor, easy access.", "home", 4500, "Lahore", 20, 4],
  ["Photograph our shop signboard for Google Business", "Clear daytime photo of the shopfront with the signboard readable, plus two inside shots. GPS tag preferred.", "verification", 1200, "Islamabad", 30, 2],
  ["Write 5 Urdu product descriptions for our online store", "Simple, warm Urdu (not too formal). Products: honey, desi ghee, dates, saffron, dry fruit gift box. Around 80 words each.", "writing", 3000, null, 48, 6],
  ["Data entry: 200 invoices into an Excel sheet", "Scanned invoices shared via Drive. Need date, vendor, amount and tax columns filled accurately.", "other", 2500, "Karachi", 52, 5],
  ["Fix a leaking kitchen tap today", "Water drips constantly under the sink. Replace the washer and check the joint — I am home after 5pm.", "home", 1500, "Lahore", 1, 1],
];

// Which demo task indexes have already been "applied for" by demo providers,
// so the board shows a believable mix of 0 / 1 / 2 proposals. Each entry carries
// the proposal terms (price + delivery) the provider would have quoted.
const APPLICANTS = {
  1: [
    { price: 5800, days: 4, message: "Do logo concepts bana ke bhej dunga, aap pasand wala choose karein. Streetwear ke liye bold wordmark best chalega." },
    { price: 6500, days: 3, message: "I have designed for two clothing labels before. Wordmark plus a square social version, two revisions included." },
  ],
  3: [
    { price: 14000, days: 6, message: "Next.js page bana kar bhej dunga, mobile par bhi perfect. Contact form ke liye aap ka email chahiye hoga." },
  ],
  5: [
    { price: 1100, days: 1, message: "Shop ke bahar se signboard ki clear photo, andar ke do shots — GPS tag ke saath. Islamabad mein hoon." },
    { price: 1200, days: 2, message: "Can do this tomorrow morning, light is better then. Will share full-resolution files." },
  ],
  7: [
    { price: 2400, days: 3, message: "200 invoices Excel mein daal dunga — date, vendor, amount aur tax columns. End par preview bhej dunga." },
  ],
};

async function clear() {
  const users = (await q(`select id from users where email = any($1)`, [[CLIENT_EMAIL, ...PROVIDERS]])).rows.map((r) => r.id);
  if (users.length) {
    const tasks = (await q(`select id from tasks where posted_by_id = any($1)`, [users])).rows.map((r) => r.id);
    if (tasks.length) {
      await q(`delete from payment_events where payment_id in (select id from payments where task_id = any($1))`, [tasks]);
      await q(`delete from payments where task_id = any($1)`, [tasks]);
      await q(`delete from applications where task_id = any($1)`, [tasks]);
      await q(`delete from messages where task_id = any($1)`, [tasks]);
      await q(`delete from reviews where task_id = any($1)`, [tasks]);
      await q(`delete from tasks where id = any($1)`, [tasks]);
    }
    await q(`delete from applications where provider_id = any($1)`, [users]);
    await q(`delete from notifications where user_id = any($1)`, [users]);
    await q(`delete from users where id = any($1)`, [users]);
  }
  console.log("showcase data cleared");
}

async function ensureUser(name, email, role, city) {
  const found = await q(`select id from users where email = $1`, [email]);
  if (found.rows.length) return found.rows[0].id;
  const hash = await bcrypt.hash(randomUUID() + randomUUID(), 12);
  const phone = "+92300" + Math.floor(1000000 + Math.random() * 8999999);
  const r = await q(
    `insert into users (id, name, email, phone, password_hash, role, city, country, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,'PK', now()) returning id`,
    [randomUUID(), name, email, phone, hash, role, city]
  );
  return r.rows[0].id;
}

async function seed() {
  const clientId = await ensureUser("KaamKaro Demo", CLIENT_EMAIL, "client", "Lahore");
  const providerIds = [];
  providerIds.push(await ensureUser("KaamKaro Demo Provider A", PROVIDERS[0], "provider", "Lahore"));
  providerIds.push(await ensureUser("KaamKaro Demo Provider B", PROVIDERS[1], "provider", "Karachi"));

  const existing = (await q(`select count(*)::int n from tasks where posted_by_id = $1 and status = 'open'`, [clientId])).rows[0].n;
  if (existing >= TASKS.length) {
    console.log("showcase already seeded — nothing to do");
    return;
  }

  const ids = [];
  for (const [title, description, category, budget, city, ageHours, daysLeft] of TASKS) {
    const id = randomUUID();
    await q(
      `insert into tasks (id, posted_by_id, posted_by_type, title, description, category, budget, currency, city, status, created_at, expires_at)
       values ($1,$2,'human',$3,$4,$5,$6,'PKR',$7,'open', now() - ($8 || ' hours')::interval, now() + ($9 || ' days')::interval)`,
      [id, clientId, title, description, category, budget, city, ageHours, daysLeft]
    );
    ids.push(id);
  }

  let proposals = 0;
  for (const [idx, entries] of Object.entries(APPLICANTS)) {
    const taskId = ids[Number(idx)];
    if (!taskId) continue;
    for (let i = 0; i < entries.length; i += 1) {
      const e = entries[i];
      await q(
        `insert into applications (id, task_id, provider_id, message, proposed_amount, currency, delivery_days, ai_drafted, status, created_at)
         values ($1,$2,$3,$4,$5,'PKR',$6,$7,'pending', now() - (($8)::int || ' hours')::interval)`,
        [randomUUID(), taskId, providerIds[i % providerIds.length], e.message, e.price, e.days, i % 2 === 1, 2 + i]
      );
      proposals += 1;
    }
  }
  console.log(`seeded ${ids.length} demo tasks with ${proposals} demo proposals (prices + delivery included)`);
}

if (process.argv.includes("--clear")) await clear();
else await seed();
await pool.end();
