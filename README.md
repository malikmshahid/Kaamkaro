<<<<<<< HEAD
# Forgot Password Security Fix

Yeh package aapke `kaamkaro.ai` project ke forgot-password flow ka security bug
fix karta hai: **reset token/link ab kabhi API response mein return nahi hoga**,
aur **response hamesha generic hoga**, chahe email registered ho ya na ho.

## Kaise integrate karein

1. **`app/api/auth/forgot-password/route.ts`**
   Apne existing forgot-password route ko is file se replace karein
   (ya isi logic ko apne existing route mein merge karein).
   - `@/db` aur `@/db/schema` import paths ko apne project ke actual
     paths ke mutabiq adjust karein.

2. **`db/schema.ts`**
   Agar aapke paas already `users` table hai to yahan se sirf
   `passwordResetTokens` table copy karein aur `userId` ko apni existing
   `users` table se reference karein. Fir Drizzle migration generate/run karein:
   ```bash
   npx drizzle-kit generate
   npx drizzle-kit migrate
   ```

3. **`lib/email.ts`**
   Yahan Resend ka example diya hai — agar aap koi aur email service
   (Nodemailer, SendGrid, Postmark, etc.) use kar rahe hain to
   `sendPasswordResetEmail()` ka andar wala implementation replace kar dein,
   function signature same rakhein.

4. **`app/forgot-password/page.tsx`**
   Apne existing frontend page ko isse replace karein — ya kam se kam
   confirm karein ke `data.resetToken` / `data.resetLink` / `data.token`
   jaisa koi bhi field frontend state ya UI mein set nahi ho raha.
   **Yeh hi original bug tha.**

5. **`app/api/auth/reset-password/route.ts`** (bonus/companion route)
   Agar aapke paas already ek reset-password verify route hai to usay
   check karein ke:
   - Token ko hash karke DB se compare kar raha hai (raw token store nahi)
   - `expiresAt` aur `used` dono check ho rahe hain
   - Consume hone ke baad `used = true` mark ho raha hai

## Environment variables

```env
APP_URL=https://kaamkaro.ai
RESEND_API_KEY=your_resend_api_key
```

## Security checklist (verify after integrating)

- [ ] Forgot-password API **hamesha** same message + same status code return
      karta hai (existing vs non-existing email dono cases mein)
- [ ] Response body mein `token`, `resetLink`, `resetUrl` jaisa koi field
      **kabhi nahi** hai
- [ ] Raw token sirf email ke andar jaata hai — DB mein sirf `tokenHash`
      (sha256) store hota hai
- [ ] Token ki expiry (30 min) aur `used` flag enforce ho rahe hain
- [ ] Reset-password route bhi generic error return karta hai (invalid/used/expired
      sab ke liye same message)
- [ ] Route par rate-limiting laga hui hai (per-IP aur per-email) taake
      koi bulk emails trigger na kar sake
=======
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
>>>>>>> origin/main
