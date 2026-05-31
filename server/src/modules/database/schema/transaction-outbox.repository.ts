import { pgTable, text, jsonb, timestamp, index, check, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { TransactionsTable } from "./transaction.repository";

export const TransactionOutboxTable = pgTable(
  "transaction_outbox",
  {
    id: text("id").primaryKey(),
    transactionId: text("transactionId")
      .notNull()
      .references(() => TransactionsTable.id, { onDelete: "cascade" })
      .unique(),
    eventType: text("eventType").notNull(),
    payload: jsonb("payload").notNull(),
    published: boolean("published").default(false).notNull(),
    publishedAt: timestamp("publishedAt"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("event_type_not_empty", sql`${table.eventType} != ''`),
    index("outbox_transaction_id_idx").on(table.transactionId),
    index("outbox_published_idx").on(table.published),
    index("outbox_created_at_idx").on(table.createdAt),
  ]
);
