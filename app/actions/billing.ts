"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { orders } from "@/db/schema/orders";
import { users } from "@/db/schema/users";
import { verifySession } from "@/lib/auth/dal";
import { clientEnv } from "@/lib/env";
import { resolvePaymentProvider } from "@/services/payment";
import { PRO_PLAN } from "@/config/plans";

export async function startProCheckout() {
  const { userId } = await verifySession();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, plan: true, stripeCustomerId: true },
  });

  if (user?.plan === "pro") {
    redirect("/billing/success");
  }

  const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const provider = resolvePaymentProvider("stripe");

  // Ensure Stripe customer exists & persist back so the Portal can see
  // prior invoices on this account.
  const { customerId } = await provider.ensureCustomer({
    userId,
    email: user?.email,
    existingCustomerId: user?.stripeCustomerId,
  });

  if (customerId !== user?.stripeCustomerId) {
    await db
      .update(users)
      .set({ stripeCustomerId: customerId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  const [order] = await db
    .insert(orders)
    .values({
      userId,
      plan: PRO_PLAN.interval,
      amountCents: PRO_PLAN.amountCents,
      currency: PRO_PLAN.currency,
      provider: "stripe",
      status: "pending",
    })
    .returning({ id: orders.id });

  const result = await provider.createCheckout({
    userId,
    userEmail: user?.email,
    customerId,
    plan: PRO_PLAN.interval,
    amountCents: PRO_PLAN.amountCents,
    currency: PRO_PLAN.currency,
    successUrl: `${siteUrl}/billing/success?order=${order.id}`,
    cancelUrl: `${siteUrl}/billing/start?canceled=1`,
    orderId: order.id,
  });

  await db
    .update(orders)
    .set({
      providerOrderId: result.providerOrderId,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  redirect(result.checkoutUrl);
}

export async function openBillingPortal() {
  const { userId } = await verifySession();
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { stripeCustomerId: true },
  });

  // User hasn't paid yet — no customer exists. Route them through checkout.
  if (!user?.stripeCustomerId) {
    redirect("/billing/start");
  }

  const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const provider = resolvePaymentProvider("stripe");
  const { url } = await provider.createPortalSession({
    customerId: user.stripeCustomerId,
    returnUrl: `${siteUrl}/dashboard`,
  });

  redirect(url);
}
