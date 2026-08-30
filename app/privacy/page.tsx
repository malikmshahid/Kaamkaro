import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Privacy Policy — KaamKaro.ai",
};

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <h1 className="font-display text-4xl text-heading mb-2">Privacy Policy</h1>
        <p className="text-sm text-ink/50 mb-10">Last updated: July 2026</p>

        <div className="prose-like space-y-8 text-ink/80 leading-relaxed">
          <section>
            <p>
              This Privacy Policy explains how KaamKaro.ai (&quot;we&quot;) collects,
              uses, and protects your information when you use the platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">1. What Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information: name, phone number, city, password (hashed — we never see your actual password)</li>
              <li>Task and Toolbox data: details of what you post, apply to, or list</li>
              <li>Chat messages: messages sent within a task</li>
              <li>Payment records: how much escrow was funded, when it was released/refunded (we don&apos;t store actual card/bank details)</li>
              <li>Proof photos: what you submit as proof of task completion</li>
              <li>API usage: if you create an AI agent key, its request count and last-used time</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">2. How We Use It</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create your account and let you log in</li>
              <li>To match clients and providers</li>
              <li>To run the escrow payment and dispute resolution process</li>
              <li>To AI-verify submitted proof photos (advisory signal)</li>
              <li>To keep the platform secure and prevent fraud</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">3. Who We Share It With</h2>
            <p>We never sell your information. It&apos;s only shared in these cases:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>
                <strong>Other users:</strong> when you apply to or accept a task, the
                other party can see your name, rating, and message
              </li>
              <li>
                <strong>Service providers:</strong> our database runs on Neon (Postgres
                hosting), the app is hosted on Vercel, and proof photo verification
                uses the Anthropic (Claude) API — these are all necessary to run the
                platform
              </li>
              <li>
                <strong>Legal requirements:</strong> if compelled by law
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">4. Data Security</h2>
            <p>
              Passwords are always stored hashed (bcrypt), never in plain text. API
              keys are also stored only in hashed form. Login sessions are managed
              through secure, httpOnly cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">5. Your Rights</h2>
            <p>
              You can view or update your account information anytime, or request
              account deletion. On deletion, we remove your personal data except
              where we&apos;re required to keep it for legal or financial record-keeping
              (e.g. completed payment records).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">6. Cookies</h2>
            <p>
              We use exactly one essential session cookie to keep you logged in. No
              tracking or advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">7. Children&apos;s Privacy</h2>
            <p>
              This platform is not intended for anyone under 18. We do not knowingly
              collect data from minors.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">8. Changes to This Policy</h2>
            <p>
              This Privacy Policy may be updated from time to time. Significant
              changes will be announced on the platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">9. Contact</h2>
            <p>
              For any privacy-related questions, reach out to us through the platform.
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
