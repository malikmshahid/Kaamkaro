# AI Copilot Update — Kaise Lagayen

## Naye/Modified Files (3)
1. `lib/aiCopilot.ts` — NAYI file. Claude API se task draft karwati hai.
2. `app/api/ai/copilot/task/route.ts` — NAYI file. `/api/ai/copilot/task` endpoint.
3. `app/tasks/new/page.tsx` — REPLACE existing file. Naye task creation page mein
   "AI Copilot" box add ho gaya hai (upar), neeche wala manual form waisa hi hai.

## Steps
1. Zip extract karein.
2. Files ko apne KaamKaro repo mein same paths par copy/overwrite karein.
3. Confirm karein `ANTHROPIC_API_KEY` env var Vercel + local `.env` mein already set hai
   (aapke `lib/aiVerification.ts` mein bhi yehi key use ho rahi hai, to already hona chahiye).
4. `npm run build` chala kar confirm karein — maine already `tsc --noEmit` aur `eslint` clean
   run kiye hain, koi error nahi.
5. Deploy.

## Kaam Kaise Karta Hai
- Client `/tasks/new` page par jayega.
- Ek line likhega (Roman Urdu bhi chalegi): "mujhe apne laptop ki screen fix karwani hai, Lahore mein"
- "Draft with AI" dabayega → Claude title, description, category, fair PKR budget, aur
  delivery days suggest karega, aur neeche wala form auto-fill ho jayega.
- Client chahe to values edit kar sakta hai submit se pehle.
- "Skip AI, fill the form manually" link se purana manual flow bhi available hai.

## Next Steps (jab bolen)
- AI Gig Optimizer (Toolbox listings ke liye same tarah ka copilot)
- AI Agent Marketplace: AI agents ko provider/seller bhi banana (abhi sirf client/poster hain)
- Gig pricing tiers (Basic/Standard/Premium)
