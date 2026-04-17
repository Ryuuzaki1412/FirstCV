import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * One order per checkout session, regardless of payment provider.
 * provider field lets us swap between Stripe / PayJS / WeChat without
 * changing downstream business logic.
 */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  plan: varchar("plan", { length: 30 }).notNull(),
  // single | monthly

  amountCents: integer("amount_cents").notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),

  provider: varchar("provider", { length: 20 }).notNull(),
  // stripe | payjs | wechat | alipay
  providerOrderId: varchar("provider_order_id", { length: 120 }),
  providerMetadata: jsonb("provider_metadata"),

  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // pending | paid | failed | refunded
  failureReason: text("failure_reason"),
  paidAt: timestamp("paid_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
