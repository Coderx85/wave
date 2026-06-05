// References - (https://orm.drizzle.team/docs/relations-v1-v2)

import { defineRelations } from "drizzle-orm";
import * as schema from "./schema"

export const relations = defineRelations(schema, (r) => ({
  users: {
    // One User <=> Many Accounts.
    accounts: r.many.auth_accounts({
      from: r.users.id,
      to: r.auth_accounts.userId,
      alias: "accounts",
    }),

    // One User <=> Many Sessions.
    sessions: r.many.sessions({
      from: r.users.id,
      to: r.sessions.userId,
      alias: "sessions",
    }),

    // One User <=> Many Transactions.
    transactions: r.many.TransactionsTable({
      from: r.users.id,
      to: r.TransactionsTable.userId,
      alias: "transactions",
    }),
  },

  sessions: {
    // One Session <=> One User.
    user: r.one.users({
      from: r.sessions.userId,
      to: r.users.id,
      alias: "user",
    }),

    // One Session <=> One Account.
    account: r.one.auth_accounts({
      from: r.sessions.userId,
      to: r.auth_accounts.userId,
      alias: "account",
    }),
  },

  AccountsTable: {
    // One Account <=> One User
    user: r.one.users({
      from: r.AccountsTable.userId,
      to: r.users.id,
      alias: "user",
    }),

    // One Account <=> Many Transactions (as Sender)
    sentTransactions: r.many.TransactionsTable({
      from: r.AccountsTable.accountNumber,
      to: r.TransactionsTable.senderAccountNumber,
      alias: "sentTransactions",
    }),

    // One Account <=> Many Transactions (as Receiver)
    receivedTransactions: r.many.TransactionsTable({
      from: r.AccountsTable.accountNumber,
      to: r.TransactionsTable.receiverAccountNumber,
      alias: "receivedTransactions",
    }),
  },
   
  LedgerTable: {
    // One Ledger Entry <=> One Transaction.
    transaction: r.one.TransactionsTable({
      from: r.LedgerTable.transactionId,
      to: r.TransactionsTable.id,
      alias: "transaction",
    }),

    // One Transaction <=> Many Ledger Entries.
    ledgerEntries: r.many.TransactionsTable({
      from: r.LedgerTable.transactionId,
      to: r.TransactionsTable.id,
      alias: "TransactionsTable",
    }),
  },

  })
);