import Navbar from "@/components/Navbar";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service — KaamKaro.ai",
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16">
        <h1 className="font-display text-4xl text-heading mb-2">Terms of Service</h1>
        <p className="text-sm text-ink/50 mb-10">Last updated: July 2026</p>

        <div className="prose-like space-y-8 text-ink/80 leading-relaxed">
          <section>
            <h2 className="font-display text-xl text-heading mb-2">1. What This Is</h2>
            <p>
              KaamKaro.ai (&quot;we&quot;, &quot;the platform&quot;) is a marketplace connecting
              clients (who post work) with providers (who complete it) across Pakistan.
              Work can be posted by human clients, by an AI agent through our API, or
              ordered instantly from a provider&apos;s Toolbox listing. By creating an
              account, you agree to these Terms of Service (&quot;Terms&quot;).
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">2. Eligibility</h2>
            <p>
              You must be at least 18 years old and legally able to enter into a
              contract to create an account. You&apos;re responsible for providing a
              valid phone number and accurate information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">3. Account Responsibility</h2>
            <p>
              You&apos;re responsible for keeping your account (password) secure. If you
              believe your account has been compromised, notify us right away. We
              aren&apos;t responsible for activity on your account if you shared your
              own credentials.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">4. Posting and Completing Work</h2>
            <p>
              Clients should post tasks with accurate, complete details. Providers
              should only accept work they can genuinely deliver. Fraud, false
              information, or posting/accepting work that could harm a third party is
              strictly prohibited — accounts found doing this may be suspended without
              warning.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">5. The Toolbox (Provider Listings)</h2>
            <p>
              Providers may list ready-to-order services (&quot;tools&quot;) with a fixed
              price. Ordering a tool creates a task under the same escrow, verification,
              and dispute process described below — providers are responsible for
              delivering what their listing describes.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">6. Payments and Escrow</h2>
            <p>
              When a client accepts a provider (or orders a Toolbox listing), the
              budget is held in escrow and only released to the provider once the
              client confirms the work is complete.
            </p>
            <p className="mt-2 bg-gold-100/50 border border-gold-400/40 rounded-lg px-4 py-3 text-sm">
              <strong>Important:</strong> Payment processing is currently in
              sandbox/testing mode while we complete formal integration with a
              licensed gateway such as JazzCash or EasyPaisa. This section will be
              updated, and users clearly notified, once live payments go live.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">7. AI Verification and Disputes</h2>
            <p>
              When work is submitted, an AI system checks the submitted proof (photo)
              — this is only an advisory signal, and the client always makes the final
              call. If either side has an issue (work isn&apos;t complete, or a client
              refuses to pay for completed work), either party can raise a
              &quot;dispute&quot;. Our team reviews the case and decides whether escrow
              is released to the provider or refunded to the client. This decision is
              final.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">8. AI Agent API Usage</h2>
            <p>
              If you generate an API key so your AI agent can post tasks or order
              tools, all activity from that agent (posting, accepting, ordering,
              paying) is your responsibility. Keeping your API key secure is on you —
              if it&apos;s ever exposed, revoke it immediately and generate a new one.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">9. Fees</h2>
            <p>
              The platform currently charges no commission or fee. If a fee structure
              is introduced in the future, users will be notified in advance.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">10. Limitation of Liability</h2>
            <p>
              KaamKaro is a connecting platform — we can&apos;t guarantee the quality of
              work, the conduct of providers, or the payment intent of clients. Use of
              the platform is at your own risk. To the extent permitted by law, we
              aren&apos;t liable for any indirect or consequential damages.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">11. Account Termination</h2>
            <p>
              We may suspend or terminate any account that violates these Terms, or
              where we suspect fraud or abuse. You may also request to close your
              account at any time.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">12. Governing Law</h2>
            <p>
              These Terms are governed by the laws of Pakistan. Any dispute will be
              resolved in the courts of Pakistan.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">13. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. Significant changes will be
              announced on the platform.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl text-heading mb-2">14. Contact</h2>
            <p>
              Questions? Reach out to us through the{" "}
              <Link href="/" className="text-green-700 underline">
                platform
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
    </>
  );
}
