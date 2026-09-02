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

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn(
      "RESEND_API_KEY not set — skipping password reset email send. " +
        "Set RESEND_API_KEY in your environment to actually deliver reset links."
    );
    return false;
  }
  await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "no-reply@kaamkaro.ai",
    to,
    subject: "Password Reset Request",
    html: `
      <p>You requested a password reset for your KaamKaro account.</p>
      <p>Click the link below to reset it (valid for 30 minutes):</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
  return true;
}

export async function sendEmailChangeOtp(to: string, otp: string): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn(
      "RESEND_API_KEY not set — skipping email-change OTP send. " +
        "Set RESEND_API_KEY in your environment to actually deliver codes."
    );
    return false;
  }
  await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "no-reply@kaamkaro.ai",
    to,
    subject: "Confirm your new KaamKaro email",
    html: `
      <p>To confirm this address as your new KaamKaro account email,
      enter the code below on your settings page (valid for 10 minutes):</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>If you didn't request this, you can safely ignore this email — your account is unaffected.</p>
    `,
  });
  return true;
}

export async function sendSignupVerificationOtp(to: string, otp: string): Promise<boolean> {
  const client = getResendClient();
  if (!client) {
    console.warn(
      "RESEND_API_KEY not set — skipping signup verification OTP send. " +
        "Set RESEND_API_KEY in your environment to actually deliver codes."
    );
    return false;
  }
  await client.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "no-reply@kaamkaro.ai",
    to,
    subject: "Verify your KaamKaro account",
    html: `
      <p>Welcome to KaamKaro! Enter the code below to verify your email and
      finish creating your account (valid for 10 minutes):</p>
      <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>If you didn't sign up for KaamKaro, you can safely ignore this email.</p>
    `,
  });
  return true;
}
