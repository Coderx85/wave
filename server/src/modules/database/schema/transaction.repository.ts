import { pgTable, text, pgEnum, check, numeric, index, bigint } from "drizzle-orm/pg-core";
import { timeStamps } from "./_column.helper";
import { users } from "./user.repository";
import { sql } from "drizzle-orm";
import type { TBankAccountNumber, TTransactionId, TUserId } from "@/types";
  
export const AccountsTable = pgTable("accounts", {
  name: text("name").notNull(),
  userId: text("userId")
  .notNull()
  .references(  
    () => users.id, { onDelete: "cascade" }
  ).$type<TUserId>(),
  accountNumber: bigint("accountNumber", { 
    mode: "bigint"
  }).notNull().unique().$type<TBankAccountNumber>(),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull(),
  ...timeStamps,
}, 
(table) => [
  check("balance_non_negative", sql`${table.balance} >= 0`),
  check("name_not_empty", sql`${table.name} != ''`),
  index("accounts_user_id_idx").on(table.userId)
]);

export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "success", "failed"]);  

export const TransactionsTable = pgTable("transactions", {
  id: text("id").primaryKey().$type<TTransactionId>(),
  senderName: text("senderName").notNull(),
  userId: text("userId")
    .notNull()
    .references(
      () => users.id, { onDelete: "cascade" }
    )
    .$type<TUserId>(),
  receiverName: text("receiverName").notNull(),
  amount: bigint("amount", { 
    mode: "bigint"
  }).notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  senderAccountNumber: bigint("senderAccountNumber", { 
      mode: "bigint"
    })
    .notNull()
    .references(() => AccountsTable.accountNumber, { onDelete: "cascade" })
    .$type<TBankAccountNumber>(),
  receiverAccountNumber: bigint("receiverAccountNumber", { 
      mode: "bigint"
    })
    .notNull()
    .references(() => AccountsTable.accountNumber, { onDelete: "cascade" })
    .$type<TBankAccountNumber>(),
  ...timeStamps
}, (table) => [
  check("amount_positive", sql`${table.amount} > 0`),
  index("transactions_sender_account_number_idx").on(table.senderAccountNumber),
  index("transactions_receiver_account_number_idx").on(table.receiverAccountNumber),
]);