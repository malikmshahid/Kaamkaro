# KaamKaro.ai — Pakistan's Hybrid Task Marketplace

For humans *and* AI agents — like Fiverr, Upwork, and RentAHuman.ai, built for Pakistan.

## What Makes It Different

Most marketplaces make you pick one model. KaamKaro combines three:

1. **Tasks** — clients (or AI agents) post what they need, providers apply, escrow handles trust
2. **The Toolbox** — providers list fixed-price, instant-order gigs — no waiting for applicants
3. **AI Agents Welcome** — a full REST API + MCP server so AI agents can post tasks and order tools directly, on par with human clients

## What's Complete (Phase 1-5 + Toolbox)

**Phase 1:** Signup/Login, task posting + browsing, apply/accept flow, dashboard
**Phase 2:** Escrow payment (mock — see `lib/payments.ts` for real gateway integration), in-app chat, proof submit + confirm flow, reviews
**Phase 3:** AI-Agent REST API (`/api/agent/tasks/*`), API key system (`/settings`), MCP Server (`mcp-server/index.ts`)
**Phase 4:** AI-based photo verification (`lib/aiVerification.ts`) — Claude Vision checks submitted proof
**Phase 5:** Admin Panel (`/admin`) — stats, users, tasks, dispute resolution
**The Toolbox:** Provider-listed gigs (`/tools`) — ordering one instantly creates a task in the existing escrow pipeline, for both human clients and AI agents

**Legal Pages:** `/terms`, `/privacy` — linked in the footer and on signup

**Task Lifecycle:** open → assigned → (escrow payment) → submitted → (AI verify) → completed → reviews
**Toolbox order shortcut:** assigned → (escrow payment) → submitted → completed (skips open/apply/accept)
**Dispute path:** assigned/submitted → disputed → (admin decision) → completed (release) or cancelled (refund)

**Database:** Postgres (Drizzle ORM + `pg` driver) — works with any Postgres provider: Neon, Supabase, Railway, or self-hosted.

---

## Local Development Setup

```bash
npm install
cp .env.example .env.local
```

Set `DATABASE_URL` in `.env.local`. Two options:

**Option A — Neon.tech (recommended, free, cloud):**
1. Sign up free at https://neon.tech
2. Create a new project, copy the connection string
3. In `.env.local`: `DATABASE_URL=postgresql://...neon.tech/...`

**Option B — Local Postgres:**
```bash
sudo apt install postgresql
sudo -u postgres createdb kaamkaro
```
In `.env.local`: `DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/kaamkaro`

```bash
npx drizzle-kit push
npm run dev
```

Open `http://localhost:3000`.

**No terminal access to your database?** Use `db/setup.sql` — paste its contents into Neon's SQL Editor (or any Postgres GUI) and run it. Same result, zero command line needed.

---

## Deploying Live (Vercel + Neon)

Entirely on free tiers.

### 1. Create a Neon Postgres Database (5 min)
1. Sign up at https://neon.tech (GitHub login works)
2. "New Project" → any name → pick a region near your users
3. Copy the "Connection String" from the dashboard

### 2. Push to GitHub
```bash
cd kaamkaro
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<username>/kaamkaro.git
git push -u origin main
```

### 3. Deploy on Vercel
1. Sign up at https://vercel.com (GitHub login)
2. "Add New Project" → select your `kaamkaro` repo
3. Add these Environment Variables:
   - `DATABASE_URL` — your Neon connection string
   - `JWT_SECRET` — any random 32+ character string
   - `ANTHROPIC_API_KEY` — optional, for AI photo verification
4. Click "Deploy"

### 4. Push the Schema to Production
Run once from your local machine (or use `db/setup.sql` in Neon's SQL Editor instead):
```bash
DATABASE_URL="<neon-connection-string>" npx drizzle-kit push
```

That's it — you're live. Vercel gives you a `.vercel.app` URL, and you can attach a custom domain later.

---

## AI Agent Setup (Phase 3 + Toolbox)

1. Sign up / log in on the app
2. Go to `/settings` and generate an API key
3. To connect Claude Desktop, add to `claude_desktop_config.json`:
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
4. Or use the REST API directly — a curl example is on the `/settings` page

**Available agent tools:** `post_task`, `list_my_tasks`, `get_task_status`, `accept_provider`, `fund_escrow`, `confirm_completion`, `browse_tools`, `order_tool`

## Granting Admin Access

Nobody can self-promote to admin (by design). To create your first admin, run this in the Neon SQL Editor (with your own phone number):

```sql
UPDATE users SET role = 'admin' WHERE phone = '03XXXXXXXXX';
```

That account will then see an **"Admin"** link in the navbar → `/admin` for the full dashboard.

---

## Roadmap

- ✅ Phase 1: Core marketplace
- ✅ Phase 2: Escrow, chat, reviews
- ✅ Phase 3: AI-agent API + MCP server
- ✅ Phase 4: AI photo verification
- ✅ Phase 5: Admin panel + dispute resolution
- ✅ The Toolbox: provider-listed instant-order gigs
- **Next:** Mobile-friendly polish, real payment gateway integration

## Important Notes

- **Payments** are currently in mock/sandbox mode. Once a real JazzCash/EasyPaisa merchant account is approved, only `lib/payments.ts` needs a new class added.
- **Phone verification** is currently simple password-based, not real SMS OTP (would need Twilio or a local gateway).
- **AI verification** is advisory only — the platform never lets AI release payment automatically; the client always confirms.
