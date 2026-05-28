import { pgTable, text, pgEnum, pgRole, check, numeric, index } from "drizzle-orm/pg-core";
import { timeStamps } from "./_column.helper";
import { users } from "./user.repository";
import { sql, sum, relations } from "drizzle-orm";
import type { TBankAccountId, TTransactionId } from "@/types/id.types";
  
export const AccountsTable = pgTable("accounts", {
  id: text("id").primaryKey().$type<TBankAccountId>(),
  name: text("name").notNull(),
  userId: text("userId")
  .notNull()
  .references(  
    () => users.id, { onDelete: "cascade" }
  ),
  accountNumber: text("accountNumber").notNull().unique(),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull(),
  ...timeStamps,
}, 
(table) => [
  check("balance_non_negative", sql`${table.balance} > 0`),
  check("name_not_empty", sql`${table.name} != ''`),
  index("accounts_user_id_idx").on(table.userId)
]);

export const accountsRelations = relations(AccountsTable, ({ one }) => ({
  // One User <=> Many Accounts
  user: one(users, {
    fields: [AccountsTable.userId],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  // One User <=> Many Accounts
  accounts: many(AccountsTable),
}));

export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);  

export const TransactionsTable = pgTable("transactions", {
  id: text("id").primaryKey().$type<TTransactionId>(),
  senderName: text("senderName").notNull(),
  receiverName: text("receiverName").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  senderAccountId: text("senderAccountId")
    .notNull()
    .references(() => AccountsTable.id, { onDelete: "cascade" }),
  receiverAccountId: text("receiverAccountId")
    .notNull()
    .references(() => AccountsTable.id, { onDelete: "cascade" }),
  ...timeStamps
}, (table) => [
  check("amount_positive", sql`${table.amount} > 0`),
  index("transactions_sender_account_id_idx").on(table.senderAccountId),
  index("transactions_receiver_account_id_idx").on(table.receiverAccountId),
]);

export const transactionsRelations = relations(TransactionsTable, ({ one }) => ({ 
  senderAccount: one(AccountsTable, {
    fields: [TransactionsTable.senderAccountId],
    references: [AccountsTable.id],
  }),
  receiverAccount: one(AccountsTable, {
    fields: [TransactionsTable.receiverAccountId],
    references: [AccountsTable.id],
  }),
}));

export const accountsTransactionsRelations = relations(AccountsTable, ({ many }) => ({
  sentTransactions: many(TransactionsTable),
  receivedTransactions: many(TransactionsTable),
}));

export const usersTransactionsRelations = relations(users, ({ many }) => ({
  sentTransactions: many(TransactionsTable),
  receivedTransactions: many(TransactionsTable),
}));