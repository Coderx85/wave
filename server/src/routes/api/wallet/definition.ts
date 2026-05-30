export const walletApiRoutes = {
  createAccount: "/accounts",
  getAccountById: "/accounts/:accountId",
  getUserAccounts: "/users/:userId/accounts",
  getBalance: "/accounts/:accountId/balance",
  transfer: "/transfers",
  listTransactions: "/users/:userId/transactions",
  queryTransactions: "/users/:userId/transactions/query",
  getLedgerEntries: "/transactions/:transactionId/ledger",
} as const;
