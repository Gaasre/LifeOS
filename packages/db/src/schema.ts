import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
