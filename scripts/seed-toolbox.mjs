/**
 * Toolbox showcase seeder — fixed-price services so the marketplace doesn't look
 * empty before real providers list anything.
 *
 *   node scripts/seed-toolbox.mjs          # add demo services (idempotent by title)
 *   node scripts/seed-toolbox.mjs --clear  # remove every demo service
 *
 * Everything belongs to the two "KaamKaro Demo" provider accounts, never to a
 * real user.
 */
import { Pool } from "pg";
import fs from "fs";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const url = fs.readFileSync(new URL("../.env", import.meta.url), "utf8").match(/DATABASE_URL=(.*)/)?.[1]?.trim();
if (!url) {
  console.error("DATABASE_URL not found in .env");
  process.exit(1);
}
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });
const q = (t, p) => pool.query(t, p);

const PROVIDERS = [
  { email: "demo.p1@kaamkaro.local", name: "KaamKaro Demo Provider A", city: "Lahore", skills: "delivery, photography, ac service, data entry", rating: 4.8, ratingCount: 14, completed: 9 },
  { email: "demo.p2@kaamkaro.local", name: "KaamKaro Demo Provider B", city: "Karachi", skills: "logo design, figma, next.js, urdu writing", rating: 4.6, ratingCount: 8, completed: 5 },
];

const SERVICES = [
  // [providerIndex, title, description, category, price, days, city, orderCount]
  [0, "AC service + gas refill (1–1.5 ton split unit)", "Full coil cleaning, filter wash, gas top-up and a cooling test at the end. Ground-floor or lift access appreciated — I bring my own tools and a drop sheet.", "home", 4500, 1, "Lahore", 23],
  [1, "Logo + social kit for a small brand", "You get a wordmark, a square Instagram version, and a 1-page usage note. Two rounds of changes included. Delivery in 3 days, files in PNG, SVG and PDF.", "design", 6000, 3, "Karachi", 17],
  [0, "Same-day parcel delivery inside Lahore", "Up to 5kg, point to point inside Lahore. I share a live location and a delivery photo with the recipient's name on the slip.", "delivery", 900, 1, "Lahore", 41],
  [1, "5 Urdu product descriptions for your store", "Warm, simple Urdu (not formal). Around 80 words each, written for WhatsApp and Daraz listings, with a short bullet list of features.", "writing", 3000, 3, null, 12],
  [0, "Shop signboard photo set for Google Business", "Clear daytime photos of your shopfront plus two inside shots. GPS tagged and delivered in full resolution. Islamabad and Rawalpindi only.", "verification", 1200, 1, "Islamabad", 8],
  [1, "One-page Next.js landing page", "Hero, features and a contact form. Responsive, deployed to your Vercel account, source code included. Content and images from you.", "coding", 15000, 5, null, 6],
  [1, "Resume / CV rewrite for a job application", "A clean one-page CV in Word and PDF, ATS-friendly, plus a short cover-letter template you can reuse. Two revisions.", "writing", 2500, 2, null, 19],
  [0, "Data entry: 100 invoices into Excel", "Date, vendor, amount and tax columns filled from scanned invoices. Shared Drive link is fine. Clean formatting, checked twice.", "other", 1500, 2, "Karachi", 15],
  [0, "Furniture assembly (flat-pack, 2–3 items)", "Bring your boxes and instructions; I assemble on site and clean up after. Extra items charged per piece, agreed before starting.", "home", 3000, 1, "Lahore", 4],
  [1, "Social media post pack (5 designs)", "Five branded post designs sized for Instagram and Facebook, editable Canva links included. Two revisions per post.", "design", 4000, 2, null, 11],
];

async function ensureProvider(p) {
  const found = await q(`select id from users where email = $1`, [p.email]);
  if (found.rows.length) {
    await q(
      `update users set name=$2, city=$3, skills=$4, rating_avg=$5, rating_count=$6, cnic_verified=true where email=$1`,
      [p.email, p.name, p.city, p.skills, p.rating, p.ratingCount]
    );
    return found.rows[0].id;
  }
  const hash = await bcrypt.hash(randomUUID() + randomUUID(), 12);
  const r = await q(
    `insert into users (id,name,email,phone,password_hash,role,city,country,skills,hourly_rate,rating_avg,rating_count,cnic_verified,created_at)
     values ($1,$2,$3,$4,$5,'provider',$6,'PK',$7,1200,$8,$9,true,now()) returning id`,
    [randomUUID(), p.name, p.email, "+9230" + Math.floor(10000000 + Math.random() * 89999999), hash, p.city, p.skills, p.rating, p.ratingCount]
  );
  return r.rows[0].id;
}

async function clear() {
  const emails = PROVIDERS.map((p) => p.email);
  const ids = (await q(`select id from users where email = any($1)`, [emails])).rows.map((r) => r.id);
  if (ids.length) {
    const res = await q(`delete from tools where provider_id = any($1)`, [ids]);
    console.log("demo services removed:", res.rowCount);
  } else {
    console.log("no demo providers found");
  }
}

async function seed() {
  const ids = [];
  for (const p of PROVIDERS) ids.push(await ensureProvider(p));

  let added = 0;
  for (const [idx, title, description, category, price, days, city, orders] of SERVICES) {
    const exists = await q(`select id from tools where title = $1`, [title]);
    if (exists.rows.length) {
      await q(
        `update tools set price=$2, delivery_days=$3, city=$4, order_count=$5, status='active' where title=$1`,
        [title, price, days, city, orders]
      );
      continue;
    }
    await q(
      `insert into tools (id, provider_id, title, description, category, price, currency, delivery_days, city, status, order_count, created_at)
       values ($1,$2,$3,$4,$5,$6,'PKR',$7,$8,'active',$9, now() - (($10)::int || ' days')::interval)`,
      [randomUUID(), ids[idx], title, description, category, price, days, city, orders, Math.floor(Math.random() * 9)]
    );
    added += 1;
  }
  const total = (await q(`select count(*)::int n from tools where status='active'`)).rows[0].n;
  console.log(`seeded ${added} new demo services · ${total} active listings total`);
}

if (process.argv.includes("--clear")) await clear();
else await seed();
await pool.end();
