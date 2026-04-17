import Stripe from "stripe";
import { env } from "@/lib/env";
import type {
  CheckoutInput,
  CheckoutResult,
  PaymentProvider,
  WebhookEvent,
} from "./types";

const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

function assertStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY in your environment.",
    );
  }
  return stripe;
}

function productNameFor(plan: CheckoutInput["plan"]): string {
  return plan === "monthly" ? "FirstCV Monthly" : "FirstCV Single Export";
}

export const stripeProvider: PaymentProvider = {
  id: "stripe",

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    const s = assertStripe();
    const session = await s.checkout.sessions.create({
      mode: input.plan === "monthly" ? "subscription" : "payment",
      customer_email: input.userEmail,
      client_reference_id: input.userId,
      line_items: [
        {
          price_data: {
            currency: input.currency.toLowerCase(),
            product_data: { name: productNameFor(input.plan) },
            unit_amount: input.amountCents,
            recurring:
              input.plan === "monthly" ? { interval: "month" } : undefined,
          },
          quantity: 1,
        },
      ],
      metadata: {
        orderId: input.orderId,
        plan: input.plan,
      },
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return {
      providerOrderId: session.id,
      checkoutUrl: session.url,
    };
  },

  async verifyAndParseWebhook(req: Request): Promise<WebhookEvent> {
    const s = assertStripe();
    const sig = req.headers.get("stripe-signature");
    if (!sig) throw new Error("Missing stripe-signature header");
    if (!env.STRIPE_WEBHOOK_SECRET)
      throw new Error("STRIPE_WEBHOOK_SECRET not set");

    const body = await req.text();
    const event = s.webhooks.constructEvent(
      body,
      sig,
      env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        providerOrderId: session.id,
        orderId: session.metadata?.orderId ?? "",
        status: "paid",
        paidAt: new Date(),
        raw: event,
      };
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      return {
        providerOrderId: session.id,
        orderId: session.metadata?.orderId ?? "",
        status: "failed",
        failureReason: "checkout_session_expired",
        raw: event,
      };
    }

    // Any other event types are a no-op for MVP; return a synthetic row
    // so the webhook handler can ignore it gracefully.
    return {
      providerOrderId: "",
      orderId: "",
      status: "failed",
      failureReason: `unhandled_event_${event.type}`,
      raw: event,
    };
  },
};
