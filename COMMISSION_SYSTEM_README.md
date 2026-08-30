# Platform Commission System — Update

TypeScript clean (`tsc --noEmit` = 0 errors). Lint errors shown are all
pre-existing (same pattern already in your codebase before this update) —
no new regressions.

## Kya Naya Hai
Ab tak escrow ka **poora paisa** provider ko milta tha — platform khud kuch
nahi kama raha tha. Ab:

- Har task payment par **commission automatically calculate** hoti hai (default **10%**, admin badal sakta hai)
- Client wahi budget pay karta hai jo dikhta hai (koi extra charge nahi)
- Provider ko **budget minus commission** milta hai — is baat ki transparency
  UI mein bhi hai (provider ko "Submit Your Work" form se pehle exact
  breakdown dikhta hai: escrow held, platform fee, net payout)
- Commission rate **snapshot** hoti hai jab payment hoti hai — baad mein rate
  badalne se purani escrow/completed payments par asar nahi padta
- Admin panel mein naya **"💰 Revenue"** tab: kitna commission ab tak kamaya
  (released), kitna pending hai (escrow mein), aur rate change karne ka form

## ⚠️ Zaroori: Migration Pehle Chalayein

```sql
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS commission_rate_percent real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_amount real NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_payout_amount real NOT NULL DEFAULT 0;

UPDATE payments SET net_payout_amount = amount WHERE net_payout_amount = 0;

CREATE TABLE IF NOT EXISTS platform_config (
  id text PRIMARY KEY DEFAULT 'default',
  commission_rate_percent real NOT NULL DEFAULT 10,
  updated_at timestamp NOT NULL DEFAULT now(),
  updated_by text
);

INSERT INTO platform_config (id, commission_rate_percent)
VALUES ('default', 10)
ON CONFLICT (id) DO NOTHING;
```
(Full file: `db/migrations/0004_platform_commission.sql`)

Neon Console → SQL Editor mein paste kar ke Run karein.

## Files (11)
1. `db/schema.ts` — commission fields on `payments`, naya `platformConfig` table
2. `db/migrations/0004_platform_commission.sql` — NAYA
3. `lib/payments.ts` — `computeCommission()` helper, `release()` ab net amount leta hai
4. `app/api/tasks/[id]/pay/route.ts` — escrow funding par commission calculate
5. `app/api/tasks/[id]/complete/route.ts` — release par net payout use hota hai
6. `app/api/admin/tasks/[id]/resolve/route.ts` — dispute resolution mein bhi net payout
7. `app/api/agent/tasks/[id]/route.ts` — agent ke pay/complete actions mein bhi commission
8. `app/api/admin/revenue/route.ts` — NAYA — revenue dashboard data
9. `app/api/admin/settings/commission/route.ts` — NAYA — rate get/set
10. `app/admin/page.tsx` — naya "Revenue" tab
11. `app/tasks/[id]/page.tsx` — provider ko fee breakdown dikhta hai

## Commands (copy-paste — CMD mein ek-ek line)

```
cd /path/to/your/kaamkaro-repo
tar -xf %USERPROFILE%\Downloads\kaamkaro-commission-system.zip
```
Phir Neon SQL Editor mein `db/migrations/0004_platform_commission.sql` ka
content paste kar ke Run karein.

```
npm install
npx tsc --noEmit
npm run build
git add .
git commit -m "Add platform commission system with admin revenue dashboard"
git push
```

## Test Karne Ka Tareeqa
1. `/admin` → "💰 Revenue" tab → rate 10% dikhna chahiye, chahen to badal dein
2. Koi test task post → provider accept → escrow fund → provider ko "Submit
   Your Work" form ke upar fee breakdown dikhega
3. Task complete hone ke baad, `/admin` → Revenue tab refresh karein →
   "Commission Earned" mein amount add ho chuka hoga

## Next Steps (jab bolen)
- Freelancer Profiles (LinkedIn-style)
- Unified Search & Discovery
