/**
 * Payment Gateway Abstraction
 * ---------------------------
 * Abhi "mock" provider use ho raha hai kyunke JazzCash/EasyPaisa merchant
 * account approval mein waqt lagta hai (3-7 din) aur real credentials chahiye.
 *
 * Jab merchant account mil jaye, bas `chargeMock` aur `releaseMock` ki jagah
 * `chargeJazzCash` / `chargeEasyPaisa` likh kar isi interface ko implement
 * karna hai — baaki app (API routes, UI) mein koi change nahi karna paray ga.
 */

export type ChargeResult = {
  success: boolean;
  providerRef: string;
  error?: string;
};

export interface PaymentProvider {
  /** Client se paisa le kar escrow mein hold karta hai */
  charge(amount: number, payerId: string): Promise<ChargeResult>;
  /** Escrow se provider ko paisa release karta hai */
  release(providerRef: string, payeeId: string): Promise<ChargeResult>;
  /** Client ko refund karta hai (dispute/cancel case) */
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
 * TODO (Phase 2 continuation, jab merchant account mil jaye):
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
