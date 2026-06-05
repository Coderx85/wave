export const walletApiRoutes = {
  createAccount: "/accounts",
  getAccountById: "/accounts/:accountId",
  getAccountByNumber: "/accounts/by-number/:accountNumber",
  getUserAccounts: "/users/:userId/accounts",
  getBalance: "/accounts/:accountId/balance",
  deposit: "/accounts/:accountId/deposit",
  transfer: "/transfers",
  listTransactions: "/users/:userId/transactions",
  queryTransactions: "/users/:userId/transactions/query",
  getLedgerEntries: "/transactions/:transactionId/ledger",
} as const;
