import { pgTable, text, jsonb, timestamp, index, check, integer, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const IdempotencyRecordsTable = pgTable(
  "idempotency_records",
  {
    key: text("key").primaryKey(),
    operation: varchar("operation", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    result: jsonb("result"),
    error: text("error"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  },
  (table) => [
    check("operation_valid", sql`${table.operation} IN ('transaction', 'balance_update', 'account_creation')`),
    check("status_valid", sql`${table.status} IN ('pending', 'completed', 'failed')`),
    index("idempotency_expires_at_idx").on(table.expiresAt),
    index("idempotency_status_idx").on(table.status),
  ]
);
