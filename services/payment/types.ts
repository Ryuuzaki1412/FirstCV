/**
 * Provider-agnostic payment contract.
 * Concrete adapters (stripe.ts, payjs.ts, ...) implement this interface;
 * business code never talks to Stripe / PayJS SDKs directly.
 */

export type PaymentProviderId = "stripe" | "payjs" | "wechat" | "alipay";

export type Plan = "single" | "monthly";

export type Currency = "USD" | "CNY";

export interface CheckoutInput {
  userId: string;
  userEmail?: string;
  plan: Plan;
  amountCents: number;
  currency: Currency;
  successUrl: string;
  cancelUrl: string;
  /** Our internal orders.id — carried through to webhook as metadata. */
  orderId: string;
}

export interface CheckoutResult {
  providerOrderId: string;
  checkoutUrl: string;
}

export interface WebhookEvent {
  providerOrderId: string;
  /** Our internal orders.id, echoed back via provider metadata. */
  orderId: string;
  status: "paid" | "failed" | "refunded";
  paidAt?: Date;
  failureReason?: string;
  raw: unknown;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyAndParseWebhook(req: Request): Promise<WebhookEvent>;
}
