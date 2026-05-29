// References - (https://orm.drizzle.team/docs/relations-v1-v2)

import { defineRelations } from "drizzle-orm";
// import { 
//   users, 
//   sessions, 
//   auth_accounts, 
//   TransactionsTable, 
//   AccountsTable,
//   LedgerTable
// } from "./";

// export const usersRelations = defineRelations({ users, sessions, auth_accounts }, (r) => ({
//   sessions: {
//     // One User <=> Many Sessions.
//     userId: r.many.sessions({
//       from: r.users.id,
//       to: r.sessions.userId,
//     })
//   },
//   // One User <=> Many Accounts.
//   accounts: r.many.auth_accounts({
//     from: r.users.id,
//     to: r.auth_accounts.userId,
//   }),
//   users: {
//     // One Session <=> One User.
//     userId: r.one.users({
//       from: r.sessions.userId,
//       to: r.users.id,
//     }),

//     // One Account <=> One User.
//     accountId: r.one.users({
//       from: r.auth_accounts.userId,
//       to: r.users.id,
//     })
//   }
// }));

// export const transactionsRelations = defineRelations({ users, AccountsTable, TransactionsTable }, (r) => ({
//   TransactionsTable: {
//     // One Transaction <=> One User
//     userId: r.one.users({
//       from: r.TransactionsTable.userId,
//       to: r.users.id,
//     }),

//     // One Transaction <=> One Account (Sender)
//     senderAccount: r.one.AccountsTable({
//       from: r.TransactionsTable.senderAccountId,
//       to: r.AccountsTable.id,
//     }),

//     // One Transaction <=> One Account (Receiver)
//     receiverAccount: r.one.AccountsTable({
//       from: r.TransactionsTable.receiverAccountId,
//       to: r.AccountsTable.id,
//     })
//   },

//   AccountsTable: {
//     // One Account <=> One User
//     userId: r.one.users({
//       from: r.AccountsTable.userId,
//       to: r.users.id,
//     })
//   },

//   users: {
//     // One User <=> Many Transactions
//     transactions: r.many.TransactionsTable({
//       from: r.users.id,
//       to: r.TransactionsTable.userId,
//     }),
//     accounts: r.many.AccountsTable({
//       from: r.users.id,
//       to: r.AccountsTable.userId,
//     })
//   },
// }));

// export const ledegerRelations = defineRelations({ TransactionsTable, LedgerTable }, (r) => ({
//   LedgerTable: {
//     // One Ledger Entry <=> One Transaction.
//     transaction: r.one.TransactionsTable({
//       from: r.LedgerTable.transactionId,
//       to: r.TransactionsTable.id,
//     }),
//   },

//   TransactionsTable: {
//     // One Transaction <=> Many Ledger Entries.
//     ledgerEntries: r.many.LedgerTable({
//       from: r.TransactionsTable.id,
//       to: r.LedgerTable.transactionId,
//       alias: "transaction"
//     })
//   }
// }));

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
      from: r.AccountsTable.id,
      to: r.TransactionsTable.senderAccountId,
      alias: "sentTransactions",
    }),

    // One Account <=> Many Transactions (as Receiver)
    receivedTransactions: r.many.TransactionsTable({
      from: r.AccountsTable.id,
      to: r.TransactionsTable.receiverAccountId,
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