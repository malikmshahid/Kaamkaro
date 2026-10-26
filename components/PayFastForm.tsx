"use client";

import { useEffect, useRef } from "react";

/**
 * PayFast's hosted checkout is reached by POSTing a form, not by a URL
 * redirect, so this component renders the hidden inputs and submits itself
 * once on mount. If JavaScript is disabled the visible button still works.
 */
export default function PayFastForm({
  action,
  fields,
}: {
  action: string;
  fields: Record<string, string>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    const id = setTimeout(() => formRef.current?.submit(), 400);
    return () => clearTimeout(id);
  }, []);

  return (
    <form ref={formRef} method="POST" action={action} className="space-y-4">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <p className="text-sm text-ink/60">Taking you to the secure PayFast checkout…</p>
      <button
        type="submit"
        className="rounded-full bg-green-900 px-6 py-3 text-cream transition-colors hover:bg-green-800"
      >
        Continue to PayFast
      </button>
      <p className="text-xs text-ink/40">
        JazzCash · Easypaisa · Raast · Debit/Credit card — all handled by PayFast.
        KaamKaro never sees your card or wallet PIN.
      </p>
    </form>
  );
}
