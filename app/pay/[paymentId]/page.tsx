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
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-16">
          <p className="text-ink/60">This payment belongs to a different account.</p>
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
        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:px-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">
              Escrow payment
            </p>
            <h1 className="mt-2 font-display text-3xl text-heading">
              {task ? task.title : "Task payment"}
            </h1>
            <p className="mt-2 text-sm text-ink/60">
              {payment.currency} {payment.amount.toLocaleString()} · held by KaamKaro until you
              confirm the work
            </p>
          </div>
          {cfg ? (
            <PaymentPoller paymentId={payment.id} taskId={payment.taskId} />
          ) : (
            <div className="rounded-2xl border border-line bg-card p-6">
              <p className="font-semibold text-heading">Payment gateway not connected yet</p>
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
                className="mt-4 inline-block rounded-full bg-green-900 px-5 py-2.5 text-sm text-cream hover:bg-green-800"
              >
                Back to the task
              </Link>
            </div>
          )}
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
      <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-14 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-500">
          Step 2 of 2
        </p>
        <h1 className="mt-2 font-display text-3xl text-heading">
          Pay {payment.currency} {payment.amount.toLocaleString()} into escrow
        </h1>
        <p className="mt-2 mb-8 text-sm text-ink/60">
          {task?.title ? `For “${task.title}”. ` : ""}
          KaamKaro holds the money and only releases it when you confirm the work is done.
        </p>

        {form ? (
          <div className="rounded-2xl border border-line bg-card p-6">
            <PayFastForm action={form.action} fields={form.fields} />
          </div>
        ) : (
          <div className="rounded-2xl border border-gold-400/40 bg-gold-100/60 p-6 dark:bg-gold-500/10">
            <p className="font-semibold text-heading">PayFast didn’t respond</p>
            <p className="mt-2 text-sm text-ink/70">
              We couldn’t get a checkout token just now. Nothing was charged — please try again.
            </p>
            <Link
              href={`/pay/${payment.id}`}
              className="mt-4 inline-block rounded-full bg-green-900 px-5 py-2.5 text-sm text-cream hover:bg-green-800"
            >
              Try again
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
