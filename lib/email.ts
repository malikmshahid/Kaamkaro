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
