import { pgTable, text, timestamp, index, check, varchar, boolean, primaryKey } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./user.repository";
import { TransactionsTable } from "./transaction.repository";

export const NotificationsTable = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    transactionId: text("transactionId")
      .notNull()
      .references(() => TransactionsTable.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    read: boolean("read").default(false).notNull(),
    sentAt: timestamp("sentAt"),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("status_valid", sql`${table.status} IN ('pending', 'sent', 'failed')`),
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_transaction_id_idx").on(table.transactionId),
    index("notifications_status_idx").on(table.status),
    index("notifications_created_at_idx").on(table.createdAt),
  ]
);

export const NotificationPreferencesTable = pgTable(
  "notification_preferences",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: varchar("eventType", { length: 50 }).notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.eventType] }),
    index("notification_preferences_user_id_idx").on(table.userId),
  ]
);
