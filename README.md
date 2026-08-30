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
