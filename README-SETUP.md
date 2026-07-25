# KaamKaro.ai — Pakistan ka Hybrid Task Marketplace

Insaan aur AI agents dono ke liye — Fiverr/Upwork/RentAHuman jesa, lekin Pakistan ke liye bana hua.

## Kya Complete Hai (Phase 1-4)

**Phase 1:** Signup/Login, Task posting + browsing, Apply/Accept flow, Dashboard
**Phase 2:** Escrow payment (mock — real gateway ke liye `lib/payments.ts` dekhein), In-app chat, Proof submit + confirm flow, Reviews
**Phase 3:** AI-Agent REST API (`/api/agent/tasks/*`), API key system (`/settings`), MCP Server (`mcp-server/index.ts`)
**Phase 4:** AI-based photo verification (`lib/aiVerification.ts`) — Claude Vision se submitted proof check karta hai

**Phase 5:**
- Admin Panel (`/admin`) — overview stats, all users, all tasks, dispute queue
- Dispute Resolution — client ya provider "Dispute utha kar admin ko bulayein" button se flag kar sakte hain, admin ek click mein escrow ko release ya refund kar sakta hai
- Admin access sirf database se manually diya jata hai (security ke liye koi self-serve admin creation nahi)

**Legal Pages:**
- `/terms` — Terms of Service
- `/privacy` — Privacy Policy
- Dono footer mein aur signup form mein link hain

**Task Lifecycle:** open → assigned → (escrow payment) → submitted → (AI verify) → completed → reviews
**Dispute path:** assigned/submitted → disputed → (admin decision) → completed (release) ya cancelled (refund)

**Database:** Postgres (Drizzle ORM + `pg` driver) — kisi bhi Postgres provider ke sath kaam karta hai: Neon, Supabase, Railway, ya self-hosted.

---

## Local Development Setup

```bash
# 1. Dependencies install karein
npm install

# 2. .env.local banayein
cp .env.example .env.local
```

`.env.local` mein `DATABASE_URL` set karein. Do options hain:

**Option A — Neon.tech (recommended, free, cloud):**
1. https://neon.tech pe free account banayein
2. Ek naya project banayein, connection string copy karein
3. `.env.local` mein: `DATABASE_URL=postgresql://...neon.tech/...`

**Option B — Local Postgres (agar apne computer pe test karna hai):**
```bash
# Postgres install (agar pehle se nahi hai)
sudo apt install postgresql
sudo -u postgres createdb kaamkaro
```
`.env.local` mein: `DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kaamkaro`

```bash
# 3. Schema database mein push karein
npx drizzle-kit push

# 4. Dev server chalayein
npm run dev
```

Browser mein `http://localhost:3000` khol lein.

---

## Live Deploy Karna (Vercel + Neon)

Ye poora free tier pe ho sakta hai. Steps:

### 1. Neon Postgres Banayein (5 min)
1. https://neon.tech pe signup karein (GitHub se ho jata hai)
2. "New Project" → koi bhi naam dein → region "Asia" ke qareeb choose karein
3. Dashboard pe "Connection String" copy karein (kuch aisi dikhegi: `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require`)

### 2. GitHub Pe Push Karein
```bash
cd kaamkaro
git init
git add .
git commit -m "Initial commit"
```
Phir GitHub pe ek naya repo banayein aur push karein:
```bash
git remote add origin https://github.com/<username>/kaamkaro.git
git push -u origin main
```

### 3. Vercel Pe Deploy Karein
1. https://vercel.com pe signup (GitHub se)
2. "Add New Project" → apna `kaamkaro` repo select karein
3. **Environment Variables** section mein ye 3 add karein:
   - `DATABASE_URL` — Neon se copy ki hui connection string
   - `JWT_SECRET` — koi bhi random 32+ character string (e.g. `openssl rand -hex 32` se generate karein)
   - `ANTHROPIC_API_KEY` — agar AI verification chahiye (optional, blank chor sakte hain)
4. "Deploy" dabayein

### 4. Database Schema Production Mein Push Karein
Apne local machine se (ek hi baar zaroori hai):
```bash
DATABASE_URL="<neon-connection-string>" npx drizzle-kit push
```

Bas — platform live hai! Vercel aapko ek `.vercel.app` URL dega, aur baad mein apna domain (e.g. `kaamkaro.pk`) bhi attach kar sakte hain.

---

## AI Agent Setup (Phase 3)

1. App pe signup/login karein
2. `/settings` page pe jayein aur ek API key generate karein
3. Claude Desktop ke sath connect karne ke liye `claude_desktop_config.json` mein:
   ```json
   {
     "mcpServers": {
       "kaamkaro": {
         "command": "npx",
         "args": ["tsx", "/absolute/path/to/kaamkaro/mcp-server/index.ts"],
         "env": {
           "KAAMKARO_API_URL": "https://your-deployed-url.vercel.app",
           "KAAMKARO_API_KEY": "kk_live_..."
         }
       }
     }
   }
   ```
4. Ya seedha REST API use karein (`/settings` page pe curl example maujood hai)

**Available agent tools:** `post_task`, `list_my_tasks`, `get_task_status`, `accept_provider`, `fund_escrow`, `confirm_completion`

---

## Agle Phases (Roadmap)

- ✅ Phase 1: Core marketplace
- ✅ Phase 2: Escrow, chat, reviews
- ✅ Phase 3: AI-agent API + MCP server
- ✅ Phase 4: AI photo verification
- ✅ Phase 5: Admin panel + dispute resolution
- **Agla:** Mobile-friendly polish, Terms of Service/Privacy Policy, real payment gateway integration

## Admin Access Kaise Dein

Koi bhi user khud se admin nahi ban sakta (security). Pehla admin banane ke liye,
Neon SQL Editor mein ye chalayein (apna phone number daal kar):

```sql
UPDATE users SET role = 'admin' WHERE phone = '03XXXXXXXXX';
```

Uske baad us account se login karke Navbar mein **"Admin"** link dikhega → `/admin` pe
poora dashboard: platform stats, sab users, sab tasks, aur active disputes.

**Dispute resolve karne ka tareeqa:** Admin panel ke "Disputes" tab mein har dispute ke
sath 2 buttons hain — "Provider Ko Release Karein" (agar provider ka kaam sahi tha) ya
"Client Ko Refund Karein" (agar provider ne kaam nahi kiya). Dono full escrow payment ko
move karte hain aur task ko final state (`completed` ya `cancelled`) mein daal dete hain.

## Important Notes

- **Payment:** Abhi mock/sandbox mode mein hai. Real JazzCash/EasyPaisa merchant account milne ke baad `lib/payments.ts` mein sirf ek class add karni hai.
- **Phone verification:** Abhi simple password-based hai, real SMS OTP nahi (Twilio ya local gateway chahiye hogi).
- **AI verification:** Advisory hai, final decision hamesha client ka hai — automatic payment kabhi AI khud release nahi karta.
