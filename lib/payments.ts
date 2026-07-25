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
  /** Releases escrowed funds to the provider */
  release(providerRef: string, payeeId: string): Promise<ChargeResult>;
  /** Refunds the client (dispute/cancel case) */
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
  async release(providerRef: string, payeeId: string): Promise<ChargeResult> {
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
