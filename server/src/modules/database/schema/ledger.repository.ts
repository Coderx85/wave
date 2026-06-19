import { pgTable, text, pgEnum, check, index, bigint } from "drizzle-orm/pg-core";
import { timeStamps } from "./_column.helper";
import { sql } from "drizzle-orm";
import type { TBankAccountNumber, TLedgerEntryId, TTransactionId } from "@/types/id.types";
import { TransactionsTable } from "./transaction.repository";

export const entryTypeEnum = pgEnum("entry_type", ["debit", "credit"]);

export const LedgerTable = pgTable("ledger_entries", {
  id: text("id").primaryKey().$type<TLedgerEntryId>(),
  transactionId: text("transactionId").notNull().$type<TTransactionId>()
    .references(() => TransactionsTable.id, { onDelete: "cascade" }),
  accountNumber: bigint("accountNumber", { mode: "bigint" }).notNull().$type<TBankAccountNumber>(),
  amount: bigint("amount", { mode: "bigint" }).notNull(),
  entryType: entryTypeEnum("entry_type").notNull(),
  ...timeStamps
}, (table) => [
  check("amount_positive", sql`${table.amount} > 0`),
  index("ledger_entries_transaction_id_idx").on(table.transactionId),
  index("ledger_entries_account_number_idx").on(table.accountNumber)
]);