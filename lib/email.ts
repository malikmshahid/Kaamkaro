import { Resend } from "resend"; // npm i resend  — or swap for nodemailer/whatever you already use

// Lazily instantiated: creating a Resend client eagerly at module scope
// throws immediately if RESEND_API_KEY is unset, which crashes `next build`
// / any route that imports this file. Instantiate only when actually sending.
let resend: Resend | null = null;
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const client = getResendClient();
  if (!client) {
    console.warn(
      "RESEND_API_KEY not set — skipping password reset email send. " +
        "Set RESEND_API_KEY in your environment to actually deliver reset links."
    );
    return;
  }
  await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "no-reply@kaamkaro.ai",
    to,
    subject: "Password Reset Request",
    html: `
      <p>Aap ne password reset request ki hai.</p>
      <p>Neeche diye gaye link par click karein (yeh link 30 minutes ke liye valid hai):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Agar aap ne yeh request nahi ki, is email ko ignore kar dein.</p>
    `,
  });
}

export async function sendEmailChangeOtp(to: string, otp: string) {
  const client = getResendClient();
  if (!client) {
    console.warn(
      "RESEND_API_KEY not set — skipping email-change OTP send. " +
        "Set RESEND_API_KEY in your environment to actually deliver codes."
    );
    return;
  }
  await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "no-reply@kaamkaro.ai",
    to,
    subject: "Confirm your new KaamKaro email",
    html: `
      <p>Apna KaamKaro account ka email is address par change karne ke liye,
      neeche diya gaya code apni settings page par darj karein (10 minutes ke liye valid hai):</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>Agar aap ne yeh request nahi ki, is email ko ignore kar dein — aapka account tab tak safe hai.</p>
    `,
  });
}
