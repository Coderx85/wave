export const performanceRoutes = {
  /** Max throughput benchmark — sequential single-threaded transfers */
  benchmarkTransfers: "/benchmark/transfers",
  /** Concurrent throughput benchmark — parallel transfers */
  benchmarkConcurrentTransfers: "/benchmark/transfers/concurrent",
  /** SSE connection capacity benchmark */
  benchmarkSSE: "/benchmark/sse",
  /** Get user's accounts for benchmark configuration */
  benchmarkAccounts: "/benchmark/accounts",
} as const;
