import { stripeProvider } from "./stripe";
import type { PaymentProvider, PaymentProviderId } from "./types";

export * from "./types";

/**
 * Registry of available payment providers.
 * Add PayJS / WeChat / Alipay adapters here when ready — business code
 * only needs to call resolvePaymentProvider(id).
 */
const providers: Partial<Record<PaymentProviderId, PaymentProvider>> = {
  stripe: stripeProvider,
};

export function resolvePaymentProvider(
  id: PaymentProviderId = "stripe",
): PaymentProvider {
  const provider = providers[id];
  if (!provider) {
    throw new Error(`Payment provider not configured: ${id}`);
  }
  return provider;
}

/**
 * Pick a provider based on user context. For MVP we always return Stripe;
 * later this is where we route CN users to PayJS/WeChat.
 */
export function pickPaymentProviderForUser(user: {
  region?: string;
  locale?: string;
}): PaymentProvider {
  // TODO: once PayJS adapter is ready, switch CN users here.
  void user;
  return stripeProvider;
}
