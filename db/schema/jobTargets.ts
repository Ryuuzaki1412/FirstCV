import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { resumes } from "./resumes";

/**
 * The job direction a user is targeting for a given resume.
 * Drives which prompt strategy the AI layer uses for rewriting and checkup.
 */
export const jobTargets = pgTable("job_targets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  resumeId: uuid("resume_id")
    .notNull()
    .references(() => resumes.id, { onDelete: "cascade" }),

  category: varchar("category", { length: 50 }).notNull(),
  subCategory: varchar("sub_category", { length: 80 }),
  keywords: jsonb("keywords"),
  notes: text("notes"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type JobTarget = typeof jobTargets.$inferSelect;
export type NewJobTarget = typeof jobTargets.$inferInsert;
