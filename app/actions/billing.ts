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
    columns: { email: true, plan: true },
  });

  if (user?.plan === "pro") {
    // Already paid — no need to check out again.
    redirect("/billing/success");
  }

  const siteUrl = clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

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

  const provider = resolvePaymentProvider("stripe");
  const result = await provider.createCheckout({
    userId,
    userEmail: user?.email,
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
