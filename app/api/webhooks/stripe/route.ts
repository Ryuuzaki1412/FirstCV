import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders } from "@/db/schema/orders";
import { users } from "@/db/schema/users";
import { resolvePaymentProvider } from "@/services/payment";

// Webhook must run on Node runtime so Stripe.Event verification + DB writes work.
export const runtime = "nodejs";

export async function POST(req: Request) {
  const provider = resolvePaymentProvider("stripe");

  let event;
  try {
    event = await provider.verifyAndParseWebhook(req);
  } catch (err) {
    const message = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json(
      { error: `Webhook verification failed: ${message}` },
      { status: 400 },
    );
  }

  if (!event.orderId) {
    // Unknown/unhandled event type — acknowledge so Stripe doesn't retry forever.
    return NextResponse.json({ received: true });
  }

  const order = await db.query.orders.findFirst({
    where: eq(orders.id, event.orderId),
  });
  if (!order) {
    return NextResponse.json({ received: true });
  }

  if (event.status === "paid") {
    await db
      .update(orders)
      .set({
        status: "paid",
        paidAt: event.paidAt ?? new Date(),
        providerMetadata: event.raw as object,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await db
      .update(users)
      .set({ plan: "pro", updatedAt: new Date() })
      .where(eq(users.id, order.userId));
  } else if (event.status === "failed") {
    await db
      .update(orders)
      .set({
        status: "failed",
        failureReason: event.failureReason ?? null,
        providerMetadata: event.raw as object,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
  } else if (event.status === "refunded") {
    await db
      .update(orders)
      .set({
        status: "refunded",
        providerMetadata: event.raw as object,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await db
      .update(users)
      .set({ plan: "free", updatedAt: new Date() })
      .where(eq(users.id, order.userId));
  }

  return NextResponse.json({ received: true });
}
