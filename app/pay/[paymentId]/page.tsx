import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import PayFastForm from "@/components/PayFastForm";
import PaymentPoller from "@/components/PaymentPoller";
import { db } from "@/db";
import { payments, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import {
  getPayFastConfig,
  requestAccessToken,
  buildCheckoutForm,
} from "@/lib/payments/payfast";

export const dynamic = "force-dynamic";

/**
 * /pay/[paymentId] — checkout hand-off.
 *
 * Plain visit  → builds the PayFast hosted-checkout form and posts to it.
 * Back from gateway (?back=1) → shows the confirming screen that polls status.
 */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentId: string }>;
  searchParams: Promise<{ back?: string }>;
}) {
  const { paymentId } = await params;
  const { back } = await searchParams;

  const session = await getSessionUser();
  if (!session) redirect(`/login?next=/pay/${paymentId}`);

  const rows = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  const payment = rows[0];
  if (!payment) notFound();
  if (payment.payerId !== session.userId) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16 sm:px-6">
          <div className="card-lux rounded-2xl p-8 text-center">
            <p className="font-display text-2xl text-heading">Not your payment</p>
            <p className="mt-2 text-sm text-ink/60">
              This checkout belongs to a different account. Open the task from your own dashboard
              to pay for it.
            </p>
            <Link
              href="/dashboard"
              className="sheen mt-6 inline-block rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream"
            >
              Go to dashboard
            </Link>
          </div>
        </main>
      </>
    );
  }

  const taskRows = await db.select().from(tasks).where(eq(tasks.id, payment.taskId)).limit(1);
  const task = taskRows[0];

  // Already funded — nothing to pay, send them back to the task.
  if (payment.status === "held_in_escrow" || payment.status === "released") {
    redirect(`/tasks/${payment.taskId}`);
  }

  const cfg = getPayFastConfig();

  // Returned from the gateway, or the gateway isn't configured: show status.
  if (back === "1" || !cfg) {
    return (
      <>
        <Navbar />
        <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-3xl px-5 py-10 sm:px-6 sm:py-12">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
              Escrow payment
            </p>
            <h1 className="mt-4 font-display text-[1.9rem] font-medium leading-[1.06] tracking-[-0.02em] text-heading sm:text-[2.6rem]">
              {task ? task.title : "Task payment"}
            </h1>
            <p className="mt-3 font-display text-2xl text-heading">
              {payment.currency} {payment.amount.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-ink/60">
              Held by KaamKaro until you confirm the work — never paid out on the provider&apos;s word.
            </p>
          </div>
        </section>
        <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6 sm:py-10">
          {cfg ? (
            <PaymentPoller paymentId={payment.id} taskId={payment.taskId} />
          ) : (
            <div className="card-lux rounded-2xl p-6">
              <p className="font-display text-lg text-heading">Payment gateway not connected yet</p>
              <p className="mt-2 text-sm text-ink/65">
                PayFast merchant credentials are not set on this deployment, so escrow payments
                are being recorded without a checkout. Add{" "}
                <code className="rounded bg-paper px-1.5 py-0.5 text-xs">PAYFAST_MERCHANT_ID</code>{" "}
                and{" "}
                <code className="rounded bg-paper px-1.5 py-0.5 text-xs">PAYFAST_SECURED_KEY</code>{" "}
                to switch real payments on.
              </p>
              <Link
                href={`/tasks/${payment.taskId}`}
                className="mt-4 inline-block rounded-full border border-line bg-card px-5 py-2.5 text-sm font-semibold text-heading"
              >
                Back to the task
              </Link>
            </div>
          )}
        </div>
      </main>
      </>
    );
  }

  // Fresh visit → get a token and hand the browser to PayFast.
  const token = await requestAccessToken(cfg, {
    basketId: payment.basketId || payment.id,
    amount: payment.amount,
    currency: payment.currency,
  });

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://kaamkaro.ai";
  const form = token.ok
    ? buildCheckoutForm(cfg, {
        token: token.token,
        basketId: payment.basketId || payment.id,
        amount: payment.amount,
        currency: payment.currency,
        description: `KaamKaro escrow — ${task?.title || "task"}`,
        successUrl: `${origin}/pay/return?basket=${encodeURIComponent(payment.basketId || "")}`,
        failureUrl: `${origin}/pay/return?basket=${encodeURIComponent(payment.basketId || "")}&failed=1`,
        callbackUrl: `${origin}/api/payments/payfast/callback`,
      })
    : null;

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="aurora grain relative isolate overflow-hidden border-b border-line">
          <div className="relative mx-auto w-full max-w-4xl px-5 py-10 sm:px-6 sm:py-12">
            <p className="inline-flex items-center gap-2.5 rounded-full border border-gold-500/35 bg-card/70 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-gold-600 shadow-lux-sm backdrop-blur dark:text-gold-300">
              <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-gold-500" />
              Step 2 of 2 · escrow
            </p>
            <h1 className="mt-4 font-display text-[1.95rem] font-medium leading-[1.05] tracking-[-0.02em] text-heading sm:text-[2.7rem]">
              Pay <span className="gold-text">{payment.currency} {payment.amount.toLocaleString()}</span>
              <br className="hidden sm:block" /> into escrow.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
              {task?.title ? `For “${task.title}”. ` : ""}
              KaamKaro holds the money and releases it only when you confirm the work is done.
            </p>
          </div>
        </section>

        <div className="mx-auto grid w-full max-w-4xl gap-6 px-5 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="card-lux rounded-2xl p-5 sm:p-6">
            {form ? (
              <PayFastForm action={form.action} fields={form.fields} />
            ) : (
              <div className="rounded-xl border border-gold-400/40 bg-gold-100/60 p-5 dark:bg-gold-500/10">
                <p className="font-display text-lg text-heading">PayFast didn&apos;t respond</p>
                <p className="mt-2 text-sm text-ink/70">
                  We couldn&apos;t get a checkout token just now. Nothing was charged — please try
                  again.
                </p>
                <Link
                  href={`/pay/${payment.id}`}
                  className="sheen mt-4 inline-block rounded-full bg-green-700 px-5 py-2.5 text-sm font-semibold text-cream"
                >
                  Try again
                </Link>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="card-lux relative overflow-hidden rounded-2xl p-5">
              <div className="gold-hairline absolute inset-x-5 top-0 opacity-70" aria-hidden="true" />
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink/45">
                What happens next
              </p>
              <ol className="mt-3 space-y-3 text-[13px] text-ink/70">
                {[
                  [ "01", "You pay", "PayFast processes the card or wallet — we never see the number." ],
                  [ "02", "We hold it", "Money sits in escrow. The provider cannot touch it yet." ],
                  [ "03", "Work happens", "Chat, proof and AI verification all stay on the task." ],
                  [ "04", "You release", "Only your confirmation (or an admin decision) pays out." ],
                ].map(([n, title, body]) => (
                  <li key={n} className="flex gap-3">
                    <span className="tnum mt-0.5 font-display text-[13px] text-gold-600 dark:text-gold-300">
                      {n}
                    </span>
                    <span>
                      <span className="font-semibold text-heading">{title}.</span> {body}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-2xl border border-line bg-card/70 p-4 text-[12px] leading-relaxed text-ink/55">
              Card details are entered on PayFast&apos;s own page. If anything goes wrong, the
              server-to-server callback — not your browser — decides whether the payment landed.
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}
