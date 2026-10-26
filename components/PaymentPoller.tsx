"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * "Confirming your payment" screen.
 *
 * After the shopper returns from PayFast we poll our own status endpoint. That
 * endpoint re-queries the gateway, so this screen finishes correctly even if
 * PayFast's server callback is still in flight (they race each other).
 */
export default function PaymentPoller({
  paymentId,
  taskId,
}: {
  paymentId: string;
  taskId: string;
}) {
  const [state, setState] = useState<"checking" | "funded" | "timeout" | "error">("checking");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    async function tick() {
      tries += 1;
      try {
        const res = await fetch(`/api/payments/payfast/status?paymentId=${paymentId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (cancelled) return;

        if (data.status === "held_in_escrow" || data.status === "released") {
          setState("funded");
          return;
        }
        if (!res.ok) {
          setDetail(data.error || "");
        } else if (data.note) {
          setDetail(data.note);
        }
        if (tries >= 20) {
          setState("timeout");
          return;
        }
        setTimeout(tick, 3000);
      } catch {
        if (!cancelled) setState("error");
      }
    }

    tick();
    return () => {
      cancelled = true;
    };
  }, [paymentId]);

  if (state === "funded") {
    return (
      <div className="rounded-2xl border border-green-800/25 bg-green-950 p-7 text-center text-cream">
        <p className="font-display text-2xl">Payment confirmed</p>
        <p className="mt-2 text-sm text-cream/70">
          Your money is held in escrow. The provider has been told to start work.
        </p>
        <Link
          href={`/tasks/${taskId}`}
          className="mt-5 inline-block rounded-full bg-cream px-6 py-2.5 font-semibold text-green-900 hover:bg-gold-100"
        >
          Back to the task
        </Link>
      </div>
    );
  }

  if (state === "timeout" || state === "error") {
    return (
      <div className="rounded-2xl border border-gold-400/50 bg-gold-100/60 p-7 text-center dark:bg-gold-500/10">
        <p className="font-display text-xl text-heading">
          {state === "timeout" ? "Still waiting for the gateway" : "Couldn’t reach the gateway"}
        </p>
        <p className="mt-2 text-sm text-ink/70">
          If the money left your wallet, it is safe — the payment will show up as funded
          automatically. Nothing is lost and the provider cannot be paid twice.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="rounded-full bg-green-900 px-5 py-2.5 text-sm text-cream hover:bg-green-800"
          >
            Check again
          </button>
          <Link
            href={`/tasks/${taskId}`}
            className="rounded-full border border-green-900/30 px-5 py-2.5 text-sm text-green-800 dark:text-heading"
          >
            Back to task
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-line bg-card p-7 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-gold-500">
        Confirming with PayFast
      </p>
      <p className="mt-3 font-display text-xl text-heading">Hold on a moment…</p>
      <p className="mt-2 text-sm text-ink/60">
        We’re asking PayFast to confirm the transaction. This usually takes a few seconds.
      </p>
      <div className="mx-auto mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-line">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-green-800" />
      </div>
      {detail && <p className="mt-4 text-xs text-ink/40">{detail}</p>}
    </div>
  );
}
