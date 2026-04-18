/**
 * Single source of truth for paid plan pricing.
 * Stripe checkout + landing pricing copy + success page all read from here.
 *
 * These prices are what we charge; if you edit them here you must also
 * recreate the Stripe dashboard products/prices or (our default) let
 * Stripe create line items on the fly via price_data.
 */

export const PRO_PLAN = {
  id: "pro" as const,
  name: "Pro",
  amountCents: 900,
  priceDisplay: "$9",
  priceUnit: "/ 月",
  currency: "USD" as const,
  interval: "monthly" as const,
} as const;

export type PlanId = "free" | "pro";

export function isPaidPlan(plan: string | null | undefined): plan is "pro" {
  return plan === "pro";
}
