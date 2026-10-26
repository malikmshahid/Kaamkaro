import { db } from "@/db";
import { platformConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPayFastConfig, isPayFastEnabled } from "@/lib/payments/payfast";

/**
 * Payment Gateway Abstraction
 * ---------------------------
 * Currently using the "mock" provider since JazzCash/EasyPaisa merchant
 * account approval takes time (3-7 days) and needs real credentials.
 *
 * Once a merchant account is approved, implement `chargeJazzCash` /
 * `chargeEasyPaisa` against this same interface — the rest of the app
 * (API routes, UI) won't need to change at all.
 */

export type ChargeResult = {
  success: boolean;
  providerRef: string;
  error?: string;
};

export interface PaymentProvider {
  /** Takes payment from the client and holds it in escrow */
  charge(amount: number, payerId: string): Promise<ChargeResult>;
  /** Releases escrowed funds to the provider. `amount` is the NET payout
   * (gross minus platform commission) — the commission itself stays with
   * the platform and is never sent out. */
  release(providerRef: string, payeeId: string, amount: number): Promise<ChargeResult>;
  /** Refunds the client (dispute/cancel case) — refunds the full gross
   * amount, since if the task never happened the platform keeps no fee. */
  refund(providerRef: string): Promise<ChargeResult>;
}

// --- Mock provider: simulates instant success for local dev/demo ---
class MockPaymentProvider implements PaymentProvider {
  async charge(amount: number, payerId: string): Promise<ChargeResult> {
    return {
      success: true,
      providerRef: `mock_${Date.now()}_${payerId.slice(0, 6)}`,
    };
  }
  async release(providerRef: string, payeeId: string, amount: number): Promise<ChargeResult> {
    void amount; // mock provider doesn't move real money, just bookkeeping
    return { success: true, providerRef: `${providerRef}_released` };
  }
  async refund(providerRef: string): Promise<ChargeResult> {
    return { success: true, providerRef: `${providerRef}_refunded` };
  }
}

/**
 * TODO (once a merchant account is approved):
 *
 * class JazzCashProvider implements PaymentProvider {
 *   async charge(amount, payerId) {
 *     // POST to JazzCash Mobile Wallet API with pp_MerchantID, pp_Password,
 *     // pp_Amount (in paisa), pp_TxnRefNo, hash signature (HMAC-SHA256)
 *     // docs: https://sandbox.jazzcash.com.pk/Sandbox/wp-content/uploads/2019/12/JazzCash-Mobile-Account-Merchant-API-25-06-2019.pdf
 *   }
 * }
 *
 * class EasyPaisaProvider implements PaymentProvider {
 *   // Similar flow via EasyPaisa's Open API / Instant Pay
 * }
 */

export function getPaymentProvider(): PaymentProvider {
  return new MockPaymentProvider();
}

/**
 * Which money flow is the app running?
 *  - "payfast": real hosted checkout (JazzCash / Easypaisa / Raast / cards).
 *    Enabled automatically the moment PAYFAST_MERCHANT_ID + PAYFAST_SECURED_KEY
 *    are present in the environment.
 *  - "mock":   no gateway credentials yet, escrow is simulated. The UI labels
 *    this honestly so nobody thinks real money moved.
 */
export function paymentMode(): "payfast" | "mock" {
  return isPayFastEnabled() ? "payfast" : "mock";
}

/** Safe summary for the browser — never includes the secured key. */
export function paymentModeInfo() {
  const cfg = getPayFastConfig();
  return {
    mode: cfg ? ("payfast" as const) : ("mock" as const),
    gateway: cfg ? "payfast" : null,
    sandbox: cfg ? cfg.mode !== "live" : null,
    contractVerified: cfg ? cfg.contractVerified : false,
  };
}

/**
 * Platform Commission
 * -------------------
 * Reads the current commission rate from platform_config (falls back to 10%
 * if the row is somehow missing) and computes the split for a given gross
 * task budget. The rate is snapshotted onto the payment row at charge time
 * so changing the rate later never retroactively changes money already in
 * escrow or already released.
 */
export async function getCommissionRatePercent(): Promise<number> {
  const rows = await db.select().from(platformConfig).where(eq(platformConfig.id, "default")).limit(1);
  return rows[0]?.commissionRatePercent ?? 10;
}

export type CommissionSplit = {
  commissionRatePercent: number;
  commissionAmount: number;
  netPayoutAmount: number;
};

export async function computeCommission(grossAmount: number): Promise<CommissionSplit> {
  const rate = await getCommissionRatePercent();
  const commissionAmount = Math.round(((grossAmount * rate) / 100) * 100) / 100;
  const netPayoutAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;
  return { commissionRatePercent: rate, commissionAmount, netPayoutAmount };
}
