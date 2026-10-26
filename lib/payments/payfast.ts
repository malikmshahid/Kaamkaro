import { createHash } from "crypto";

/**
 * PayFast (Pakistan) gateway adapter
 * ----------------------------------
 * This is PayFast PK — the State Bank-licensed gateway by Avanza Premier
 * Payment Services that carries JazzCash, Easypaisa, Raast, cards and bank
 * transfers through one hosted checkout. NOT the South African payfast.co.za
 * (different company, different API, MD5 + passphrase).
 *
 * Flow implemented here:
 *   1. Backend asks for a one-time ACCESS_TOKEN
 *        POST {base}/GetAccessToken
 *        MERCHANT_ID, SECURED_KEY, BASKET_ID, TXNAMT, CURRENCY_CODE
 *   2. We render a form that POSTs to {base}/PostTransaction, which redirects
 *      the shopper to PayFast's hosted checkout (JazzCash / card / Raast …).
 *   3. PayFast posts back to our callback URL and redirects the shopper to
 *      SUCCESS_URL / FAILURE_URL.
 *   4. We NEVER trust step 3 alone — we always re-query the transaction status
 *      endpoint and compare basket id, amount and currency ourselves.
 *
 * Everything is env-driven so switching sandbox → live needs no code change:
 *   PAYFAST_MERCHANT_ID, PAYFAST_SECURED_KEY, PAYFAST_MERCHANT_NAME,
 *   PAYFAST_MODE (sandbox|live), PAYFAST_CONTRACT_VERIFIED (true|false)
 */

export type PayFastMode = "sandbox" | "live";

export type PayFastConfig = {
  merchantId: string;
  merchantName: string;
  securedKey: string;
  mode: PayFastMode;
  /** API base, e.g. https://ipguat.apps.net.pk/Ecommerce/api/Transaction */
  apiBase: string;
  /** True only once the merchant contract (callback hash + status schema) has
   *  been confirmed against a real UAT transaction. Until then a paid checkout
   *  is recorded as "pending review" instead of auto-releasing work. */
  contractVerified: boolean;
};

/** Default hosts published by PayFast PK for sandbox (UAT) and live. */
const HOSTS = {
  sandbox: "https://ipguat.apps.net.pk/Ecommerce/api/Transaction",
  live: "https://ipg1.apps.net.pk/Ecommerce/api/Transaction",
} as const;

export function getPayFastConfig(): PayFastConfig | null {
  const merchantId = process.env.PAYFAST_MERCHANT_ID?.trim();
  const securedKey = process.env.PAYFAST_SECURED_KEY?.trim();
  if (!merchantId || !securedKey) return null;

  const mode: PayFastMode = process.env.PAYFAST_MODE === "live" ? "live" : "sandbox";
  const apiBase =
    process.env.PAYFAST_API_BASE?.trim().replace(/\/$/, "") || HOSTS[mode];

  return {
    merchantId,
    merchantName: process.env.PAYFAST_MERCHANT_NAME?.trim() || "KaamKaro",
    securedKey,
    mode,
    apiBase,
    contractVerified: process.env.PAYFAST_CONTRACT_VERIFIED === "true",
  };
}

export function isPayFastEnabled(): boolean {
  return getPayFastConfig() !== null;
}

/** Amount formatting PayFast expects: plain decimal, no thousands separator. */
export function formatGatewayAmount(amount: number): string {
  return amount.toFixed(2);
}

/** PKR 1,500 -> "KK-1719000000-AB12CD" — short, unique, no PII. */
export function makeBasketId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `KK-${Date.now()}-${rand}`;
}

/**
 * Signature for the checkout form POST.
 * PayFast PK documents md5(MERCHANT_ID:MERCHANT_NAME:TXNAMT:BASKET_ID).
 */
export function checkoutSignature(input: {
  merchantId: string;
  merchantName: string;
  amount: string;
  basketId: string;
}): string {
  const raw = `${input.merchantId}:${input.merchantName}:${input.amount}:${input.basketId}`;
  return createHash("md5").update(raw).digest("hex");
}

/**
 * Ask PayFast for a one-time access token. Must run server-side: it carries
 * the secured key.
 */
export async function requestAccessToken(
  cfg: PayFastConfig,
  input: { basketId: string; amount: number; currency: string }
): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  const body = new URLSearchParams({
    MERCHANT_ID: cfg.merchantId,
    SECURED_KEY: cfg.securedKey,
    BASKET_ID: input.basketId,
    TXNAMT: formatGatewayAmount(input.amount),
    CURRENCY_CODE: input.currency || "PKR",
  });

  try {
    const res = await fetch(`${cfg.apiBase}/GetAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `token ${res.status}: ${text.slice(0, 200)}` };

    // Response is JSON like {"ACCESS_TOKEN":"..."} but older deployments have
    // returned plain text, so handle both.
    let token = "";
    try {
      const json = JSON.parse(text) as Record<string, unknown>;
      token =
        (json.ACCESS_TOKEN as string) ||
        (json.access_token as string) ||
        (json.TOKEN as string) ||
        "";
    } catch {
      token = text.trim();
    }
    if (!token) return { ok: false, error: `empty token: ${text.slice(0, 200)}` };
    return { ok: true, token };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "network error" };
  }
}

export type CheckoutForm = {
  /** Where the browser POSTs the form. */
  action: string;
  /** Hidden inputs, in the order PayFast documents them. */
  fields: Record<string, string>;
};

/**
 * The hosted-checkout form. Rendered as a real <form> in the browser because
 * PayFast's checkout is reached by a form POST, not a GET redirect.
 */
export function buildCheckoutForm(
  cfg: PayFastConfig,
  input: {
    token: string;
    basketId: string;
    amount: number;
    currency: string;
    description: string;
    customerMobile?: string | null;
    customerEmail?: string | null;
    successUrl: string;
    failureUrl: string;
    callbackUrl: string;
  }
): CheckoutForm {
  const amount = formatGatewayAmount(input.amount);
  const signature = checkoutSignature({
    merchantId: cfg.merchantId,
    merchantName: cfg.merchantName,
    amount,
    basketId: input.basketId,
  });

  const fields: Record<string, string> = {
    MERCHANT_ID: cfg.merchantId,
    MERCHANT_NAME: cfg.merchantName,
    TOKEN: input.token,
    PROCCODE: "00",
    TXNAMT: amount,
    CUSTOMER_MOBILE_NO: input.customerMobile || "",
    CUSTOMER_EMAIL_ADDRESS: input.customerEmail || "",
    SIGNATURE: signature,
    VERSION: "KAAMKARO-1.0",
    TXNDESC: input.description.slice(0, 100),
    SUCCESS_URL: input.successUrl,
    FAILURE_URL: input.failureUrl,
    BASKET_ID: input.basketId,
    ORDER_DATE: new Date().toISOString().slice(0, 19).replace("T", " "),
    CHECKOUT_URL: input.callbackUrl,
    CURRENCY_CODE: input.currency || "PKR",
  };

  return { action: `${cfg.apiBase}/PostTransaction`, fields };
}

/**
 * Verify the callback PayFast posts to CHECKOUT_URL.
 *
 * The published contract is sha256(basket_id|secured_key|merchant_id|err_code).
 * Merchants have reported variants without separators, and some use md5, so we
 * accept the documented forms and nothing else. A callback that fails every
 * variant is rejected — the payment stays pending and is never fulfilled.
 */
export function verifyCallbackSignature(
  cfg: PayFastConfig,
  payload: Record<string, string>
): { valid: boolean; matched: string | null } {
  const provided = (payload.signature || payload.SIGNATURE || "").toLowerCase();
  if (!provided) return { valid: false, matched: null };

  const basket = payload.basket_id || payload.BASKET_ID || "";
  const errCode = payload.err_code || payload.ERR_CODE || payload.response_code || "";
  const merchant = payload.merchant_id || payload.MERCHANT_ID || cfg.merchantId;

  const candidates: { name: string; value: string }[] = [
    {
      name: "sha256(basket|key|merchant|err)",
      value: createHash("sha256")
        .update(`${basket}|${cfg.securedKey}|${merchant}|${errCode}`)
        .digest("hex"),
    },
    {
      name: "sha256(basket+key+merchant+err)",
      value: createHash("sha256")
        .update(`${basket}${cfg.securedKey}${merchant}${errCode}`)
        .digest("hex"),
    },
    {
      name: "md5(basket|key|merchant|err)",
      value: createHash("md5")
        .update(`${basket}|${cfg.securedKey}|${merchant}|${errCode}`)
        .digest("hex"),
    },
  ];

  const hit = candidates.find((c) => c.value === provided);
  return { valid: Boolean(hit), matched: hit?.name ?? null };
}

export type GatewayStatus = {
  ok: boolean;
  paid: boolean;
  amount: number | null;
  currency: string | null;
  basketId: string | null;
  txnId: string | null;
  statusCode: string | null;
  message: string;
  raw: unknown;
};

/**
 * Authoritative check: ask PayFast what actually happened to a transaction.
 * Fulfilment depends on this, never on the redirect the browser came back with.
 */
export async function fetchTransactionStatus(
  cfg: PayFastConfig,
  transactionId: string
): Promise<GatewayStatus> {
  const empty: GatewayStatus = {
    ok: false,
    paid: false,
    amount: null,
    currency: null,
    basketId: null,
    txnId: null,
    statusCode: null,
    message: "status unavailable",
    raw: null,
  };
  if (!transactionId) return empty;

  try {
    const res = await fetch(`${cfg.apiBase}/${encodeURIComponent(transactionId)}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return { ...empty, message: text.slice(0, 200), raw: text };
    }

    const statusCode = String(
      data.status_code ?? data.STATUS_CODE ?? data.response_code ?? ""
    );
    const amountRaw = data.transaction_amount ?? data.TXNAMT ?? data.amount ?? null;
    const amount = amountRaw === null ? null : Number(amountRaw);

    return {
      ok: res.ok,
      // "00" is the documented success code; a few deployments send "SUCCESS".
      paid: statusCode === "00" || statusCode.toUpperCase() === "SUCCESS",
      amount: Number.isFinite(amount) ? amount : null,
      currency: String(data.currency_code ?? data.CURRENCY_CODE ?? "PKR"),
      basketId: (data.basket_id ?? data.BASKET_ID ?? null) as string | null,
      txnId: (data.transaction_id ?? data.TRANSACTION_ID ?? null) as string | null,
      statusCode: statusCode || null,
      message: String(data.status_message ?? data.STATUS_MESSAGE ?? ""),
      raw: data,
    };
  } catch (err) {
    return { ...empty, message: err instanceof Error ? err.message : "network error" };
  }
}
