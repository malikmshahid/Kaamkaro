/**
 * Email Delivery
 * ---------------
 * Uses Resend (https://resend.com — generous free tier, dead-simple API)
 * when RESEND_API_KEY is set. If it's not configured, sendEmail() returns
 * `{ sent: false }` so callers can gracefully fall back — same "mock now,
 * real later" pattern used for payments and AI verification elsewhere in
 * this codebase.
 */

type SendResult = { sent: boolean; error?: string };

export async function sendEmail(to: string, subject: string, html: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, error: "RESEND_API_KEY is not configured" };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL || "KaamKaro <onboarding@resend.dev>";

    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      return { sent: false, error: error.message };
    }
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

export function passwordResetEmailHtml(resetLink: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #123a26;">Reset your KaamKaro password</h2>
      <p>Click the button below to set a new password. This link expires in 30 minutes.</p>
      <a href="${resetLink}" style="display: inline-block; background: #123a26; color: #f7f4ec; padding: 12px 24px; border-radius: 999px; text-decoration: none; margin: 16px 0;">
        Reset Password
      </a>
      <p style="color: #666; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}

function otpEmailHtml(heading: string, intro: string, otp: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #123a26;">${heading}</h2>
      <p>${intro}</p>
      <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; background: #f7f4ec; color: #123a26; padding: 16px 24px; border-radius: 12px; text-align: center; margin: 16px 0;">
        ${otp}
      </div>
      <p style="color: #666; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}

// Step 1 of changing an account's email — code is sent to the NEW address.
export async function sendEmailChangeOtp(to: string, otp: string): Promise<boolean> {
  const html = otpEmailHtml(
    "Confirm your new KaamKaro email",
    "Enter this code to confirm this is your new email address:",
    otp
  );
  const result = await sendEmail(to, "Confirm your new KaamKaro email", html);
  return result.sent;
}

// Final step of signup when an email was provided.
export async function sendSignupVerificationOtp(to: string, otp: string): Promise<boolean> {
  const html = otpEmailHtml(
    "Verify your KaamKaro email",
    "Enter this code to verify your email and finish creating your account:",
    otp
  );
  const result = await sendEmail(to, "Verify your KaamKaro email", html);
  return result.sent;
}
