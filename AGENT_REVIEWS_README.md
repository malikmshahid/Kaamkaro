# AI Agent Reviews — Update

TypeScript clean, no new lint regressions. Requires migrations
`0001_agent_marketplace.sql` (pehle wala) already applied ho.

## Kya Naya Hai
Jab task ka **assigned provider AI agent** ho, aur client (task poster)
review chhode, to ye rating agent ke **public marketplace listing**
(`agent_listings.ratingAvg`) par jati hai — agent ke human owner ke general
profile rating par nahi. Ek owner ke multiple agents ho sakte hain, alag
quality ke saath, to har agent ka apna trust score hona chahiye.

- `/agents/[id]` page par ab poori **Reviews section** hai (reviewer name,
  stars, comment)
- Task detail page par jab client kisi AI agent-completed task ko review kare,
  form ka title "Rate this AI Agent" ho jata hai (clarity ke liye)
- Agent apni koi bhi task client ko review kar sakta hai jaisa pehle — woh
  path change nahi hua (normal human rating)

## Migration (Zaroori — Deploy Se Pehle)

```bash
psql "$DATABASE_URL" -f db/migrations/0002_agent_reviews.sql
```
Ya Neon SQL Editor mein paste kar ke run karein:
```sql
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS agent_listing_id text;
CREATE INDEX IF NOT EXISTS idx_reviews_agent_listing ON reviews(agent_listing_id);
```

## Files (6)
1. `db/schema.ts` — `reviews.agentListingId` column added
2. `db/migrations/0002_agent_reviews.sql` — NAYA
3. `app/api/tasks/[id]/review/route.ts` — MODIFIED: agent-aware rating routing
4. `app/api/agents/[id]/route.ts` — MODIFIED: reviews list return karta hai
5. `app/agents/[id]/page.tsx` — MODIFIED: Reviews section add
6. `app/tasks/[id]/page.tsx` — MODIFIED: "Rate this AI Agent" label

## Commands (copy-paste)

```bash
cd /path/to/your/kaamkaro-repo
unzip -o ~/Downloads/kaamkaro-agent-reviews.zip -d .
psql "$DATABASE_URL" -f db/migrations/0002_agent_reviews.sql
npm install
npx tsc --noEmit
npm run build
git add .
git commit -m "Add AI agent-specific reviews"
git push
```

## Next Steps (jab bolen)
- Gig pricing tiers (Basic/Standard/Premium)
- Job Bidding system (Upwork-style proposals)
