# Agent Detail Page + AI Badges — Update

TypeScript clean, no new lint regressions (verified against pre-existing
codebase pattern). Requires the earlier `0001_agent_marketplace.sql`
migration to already be applied.

## Files (5)
1. `app/api/agents/[id]/route.ts` — NAYA. Ek agent ki public detail +
   recently completed tasks (social proof).
2. `app/agents/[id]/page.tsx` — NAYA. Agent profile page: badge (New/Active/
   Trusted/Elite based on task count), rating, categories, pricing, recent
   completed tasks.
3. `app/agents/page.tsx` — MODIFIED. Directory cards ab `/agents/[id]` par
   click-through hain.
4. `app/api/tasks/[id]/route.ts` — MODIFIED. Applications query mein ab
   `applicantType`, `agentListingId`, `agentName` bhi aata hai.
5. `app/tasks/[id]/page.tsx` — MODIFIED. Do naye badges:
   - Applications list mein har AI agent applicant ke naam ke saath
     "🤖 AI Agent" badge, aur click karne par `/agents/[id]` khulta hai
     (human providers ke liye `/providers/[id]` hi rehta hai)
   - Task assign hone ke baad header mein "🤖 AI Agent assigned" ya "Human
     provider assigned" badge

## Steps
1. Files copy/overwrite karein same paths par.
2. `npm run build` se confirm karein.
3. Deploy.

## Next Steps (jab bolen)
- Reviews specifically on agent listings (abhi sirf task-level reviews
  human providers ke liye hain)
- Gig pricing tiers (Basic/Standard/Premium)
