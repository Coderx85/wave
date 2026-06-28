import type { FastifyReply, FastifyRequest } from "fastify";
import { sendSuccess, sendError } from "@/lib/response";
import { WalletService } from "@/modules/wallet/service/wallet-service";
import type { TBankAccountNumber, TUserId } from "@/types";
import type { TransferInput } from "@/modules/wallet/service/wallet-service.interface";
import http from "node:http";

const walletService = new WalletService();

// ─── Benchmark Types ────────────────────────────────────────────

interface BenchmarkConfig {
  userId: string;
  accountPairs: Array<{
    senderAccountNumber: string;
    senderName: string;
    receiverAccountNumber: string;
    receiverName: string;
  }>;
  numTransactions: number;
  amountPerTransaction: number;
}

interface ConcurrentBenchmarkConfig extends BenchmarkConfig {
  concurrency: number;
}

interface SSEBenchmarkConfig {
  userId: string;
  numConnections: number;
  durationMs: number;
}

interface LatencyStats {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

interface BenchmarkResult {
  config: {
    numTransactions: number;
    amountPerTransaction: number;
    accountPairsCount: number;
  };
  summary: {
    totalTimeMs: number;
    transactionsPerSecond: number;
    successfulTransactions: number;
    failedTransactions: number;
    latency: LatencyStats;
  };
  latencies: number[];
  errors: Array<{ index: number; error: string }>;
}

interface ConcurrentBenchmarkResult extends BenchmarkResult {
  config: BenchmarkResult["config"] & {
    concurrency: number;
  };
}

interface SSEBenchmarkResult {
  config: {
    numConnections: number;
    durationMs: number;
  };
  summary: {
    successfulConnections: number;
    failedConnections: number;
    connectionEstablishment: LatencyStats;
    timeToFirstByte: LatencyStats;
    heartbeatReceived: LatencyStats;
  };
  perConnection: Array<{
    index: number;
    establishedMs: number;
    ttfbMs: number;
    heartbeatsReceived: number;
    error?: string;
  }>;
}

// ─── Helpers ────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function computeLatencyStats(latencies: number[]): LatencyStats {
  if (latencies.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    avg: sum / sorted.length,
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

// ─── Sequential Transfer Handler ────────────────────────────────

/**
 * POST /api/performance/benchmark/transfers
 *
 * Runs N sequential transfers across configured account pairs (single-threaded).
 * Measures per-transaction latency and returns aggregated stats.
 */
export async function benchmarkTransfersHandler(
  request: FastifyRequest<{ Body: BenchmarkConfig }>,
  reply: FastifyReply,
) {
  const { userId, accountPairs, numTransactions, amountPerTransaction } = request.body;

  if (!accountPairs || accountPairs.length === 0) {
    return sendError({
      reply,
      statusCode: 400,
      message: "BAD_REQUEST",
      error: "At least one account pair is required",
    });
  }

  if (numTransactions < 1 || numTransactions > 10_000) {
    return sendError({
      reply,
      statusCode: 400,
      message: "BAD_REQUEST",
      error: "numTransactions must be between 1 and 10,000",
    });
  }

  const latencies: number[] = [];
  const errors: Array<{ index: number; error: string }> = [];
  let successCount = 0;

  console.log(`[Benchmark:sequential] Starting ${numTransactions} transfers (amount: $${amountPerTransaction})`);

  const overallStart = performance.now();

  for (let i = 0; i < numTransactions; i++) {
    const pair = accountPairs[i % accountPairs.length]!;
    const txStart = performance.now();

    try {
      await walletService.transfer({
        userId: userId as TUserId,
        senderAccountNumber: BigInt(pair.senderAccountNumber) as TBankAccountNumber,
        senderName: pair.senderName,
        receiverAccountNumber: BigInt(pair.receiverAccountNumber) as TBankAccountNumber,
        receiverName: pair.receiverName,
        amount: amountPerTransaction,
      });

      const txEnd = performance.now();
      latencies.push(txEnd - txStart);
      successCount++;
    } catch (err) {
      const txEnd = performance.now();
      latencies.push(txEnd - txStart);
      errors.push({
        index: i,
        error: err instanceof Error ? err.message : "UNKNOWN_ERROR",
      });
    }
  }

  const overallEnd = performance.now();
  const totalTimeMs = overallEnd - overallStart;

  console.log(`[Benchmark:sequential] Completed: ${successCount} success, ${errors.length} failed, ${(successCount / (totalTimeMs / 1000)).toFixed(1)} TPS`);

  const result: BenchmarkResult = {
    config: {
      numTransactions,
      amountPerTransaction,
      accountPairsCount: accountPairs.length,
    },
    summary: {
      totalTimeMs,
      transactionsPerSecond: successCount / (totalTimeMs / 1000),
      successfulTransactions: successCount,
      failedTransactions: errors.length,
      latency: computeLatencyStats(latencies),
    },
    latencies,
    errors,
  };

  sendSuccess<BenchmarkResult>({
    reply,
    statusCode: 200,
    message: "Benchmark completed",
    data: result,
  });
}

// ─── Concurrent Transfer Handler ────────────────────────────────

/**
 * POST /api/performance/benchmark/transfers/concurrent
 *
 * Runs N transfers in parallel with controlled concurrency across configured account pairs.
 * Measures per-transaction latency and returns aggregated stats.
 */
export async function benchmarkConcurrentTransfersHandler(
  request: FastifyRequest<{ Body: ConcurrentBenchmarkConfig }>,
  reply: FastifyReply,
) {
  const { userId, accountPairs, numTransactions, amountPerTransaction, concurrency } = request.body;

  if (!accountPairs || accountPairs.length === 0) {
    return sendError({
      reply,
      statusCode: 400,
      message: "BAD_REQUEST",
      error: "At least one account pair is required",
    });
  }

  if (numTransactions < 1 || numTransactions > 10_000) {
    return sendError({
      reply,
      statusCode: 400,
      message: "BAD_REQUEST",
      error: "numTransactions must be between 1 and 10,000",
    });
  }

  const effectiveConcurrency = Math.min(Math.max(concurrency || 2, 1), 50);

  console.log(`[Benchmark:concurrent] Starting ${numTransactions} transfers with concurrency=${effectiveConcurrency} (amount: $${amountPerTransaction})`);

  const latencies: number[] = new Array(numTransactions);
  const errors: Array<{ index: number; error: string }> = [];
  let successCount = 0;
  let nextIndex = 0;
  let completedCount = 0;

  const overallStart = performance.now();

  // Worker-pool: each slot runs transfers independently
  const runSlot = async (slot: number) => {
    while (true) {
      const i = nextIndex++;
      if (i >= numTransactions) break;

      const pair = accountPairs[i % accountPairs.length]!;
      const txStart = performance.now();

      try {
        await walletService.transfer({
          userId: userId as TUserId,
          senderAccountNumber: BigInt(pair.senderAccountNumber) as TBankAccountNumber,
          senderName: pair.senderName,
          receiverAccountNumber: BigInt(pair.receiverAccountNumber) as TBankAccountNumber,
          receiverName: pair.receiverName,
          amount: amountPerTransaction,
        });

        const txEnd = performance.now();
        latencies[i] = txEnd - txStart;
        successCount++;
        console.log(`[Benchmark:concurrent] Slot ${slot} completed TX #${i} in ${(txEnd - txStart).toFixed(1)}ms`);
      } catch (err) {
        const txEnd = performance.now();
        latencies[i] = txEnd - txStart;
        errors.push({
          index: i,
          error: err instanceof Error ? err.message : "UNKNOWN_ERROR",
        });
        console.log(`[Benchmark:concurrent] Slot ${slot} FAILED TX #${i}: ${err instanceof Error ? err.message : "UNKNOWN"}`);
      }

      completedCount++;
    }
  };

  // Launch all slots concurrently
  const slots = Array.from({ length: effectiveConcurrency }, (_, i) => runSlot(i));
  await Promise.all(slots);

  const overallEnd = performance.now();
  const totalTimeMs = overallEnd - overallStart;

  console.log(`[Benchmark:concurrent] Completed: ${successCount} success, ${errors.length} failed, ${(successCount / (totalTimeMs / 1000)).toFixed(1)} TPS`);

  const result: ConcurrentBenchmarkResult = {
    config: {
      numTransactions,
      amountPerTransaction,
      accountPairsCount: accountPairs.length,
      concurrency: effectiveConcurrency,
    },
    summary: {
      totalTimeMs,
      transactionsPerSecond: successCount / (totalTimeMs / 1000),
      successfulTransactions: successCount,
      failedTransactions: errors.length,
      latency: computeLatencyStats(latencies.filter((l) => l !== undefined) as number[]),
    },
    latencies: latencies.filter((l) => l !== undefined) as number[],
    errors,
  };

  sendSuccess<ConcurrentBenchmarkResult>({
    reply,
    statusCode: 200,
    message: "Concurrent benchmark completed",
    data: result,
  });
}

// ─── SSE Connection Capacity Handler ────────────────────────────

/**
 * POST /api/performance/benchmark/sse
 *
 * Opens N server-side SSE connections to the Fastify instance and measures:
 * - Connection establishment time
 * - Time-to-first-byte (TTFB)
 * - Heartbeat count over the test duration
 */
export async function benchmarkSSEHandler(
  request: FastifyRequest<{ Body: SSEBenchmarkConfig }>,
  reply: FastifyReply,
) {
  const { userId, numConnections = 100, durationMs = 10_000 } = request.body;

  if (numConnections < 1 || numConnections > 500) {
    return sendError({
      reply,
      statusCode: 400,
      message: "BAD_REQUEST",
      error: "numConnections must be between 1 and 500",
    });
  }

  // Determine server port from Fastify instance
  const serverAddress = request.server.address;
  const port = typeof serverAddress === "object" && serverAddress ? serverAddress.port : 3000;

  console.log(`[Benchmark:sse] Starting ${numConnections} SSE connections for ${durationMs}ms on port ${port}`);

  const perConnection: SSEBenchmarkResult["perConnection"] = [];
  let successfulConnections = 0;
  let failedConnections = 0;

  const overallStart = performance.now();

  // Open all connections concurrently
  const connectionPromises = Array.from({ length: numConnections }, (_, i) => {
    return new Promise<void>((resolve) => {
      const connStart = performance.now();
      let ttfbMs = 0;
      let heartbeatsReceived = 0;
      let settled = false;

      const req = http.get(
        {
          hostname: "localhost",
          port,
          path: `/api/notification/users/${userId}/notifications/stream?limit=1`,
          headers: {
            Accept: "text/event-stream",
            Connection: "keep-alive",
          },
        },
        (res) => {
          const ttfb = performance.now() - connStart;
          ttfbMs = ttfb;

          res.on("data", (chunk) => {
            const chunkStr = chunk.toString();
            // Count heartbeat pings or data events
            if (chunkStr.includes("data:") || chunkStr.includes("ping")) {
              heartbeatsReceived++;
            }
          });

          res.on("end", () => {
            if (!settled) {
              settled = true;
              const establishedMs = performance.now() - connStart;
              successfulConnections++;
              perConnection.push({
                index: i,
                establishedMs,
                ttfbMs,
                heartbeatsReceived,
              });
              console.log(`[Benchmark:sse] Connection ${i + 1}/${numConnections} established in ${establishedMs.toFixed(1)}ms | TTFB: ${ttfbMs.toFixed(1)}ms | ${heartbeatsReceived} heartbeats`);
              resolve();
            }
          });

          res.on("error", (err) => {
            if (!settled) {
              settled = true;
              const establishedMs = performance.now() - connStart;
              failedConnections++;
              perConnection.push({
                index: i,
                establishedMs,
                ttfbMs: 0,
                heartbeatsReceived: 0,
                error: err.message,
              });
              resolve();
            }
          });

          // Close connection after duration
          setTimeout(() => {
            res.destroy();
          }, durationMs);
        },
      );

      req.on("error", (err) => {
        if (!settled) {
          settled = true;
          const establishedMs = performance.now() - connStart;
          failedConnections++;
          perConnection.push({
            index: i,
            establishedMs,
            ttfbMs: 0,
            heartbeatsReceived: 0,
            error: err.message,
          });
          resolve();
        }
      });

      // Timeout safety — if connection hangs, destroy it
      setTimeout(() => {
        if (!settled) {
          settled = true;
          req.destroy();
          failedConnections++;
          perConnection.push({
            index: i,
            establishedMs: performance.now() - connStart,
            ttfbMs: 0,
            heartbeatsReceived: 0,
            error: "TIMEOUT",
          });
          resolve();
        }
      }, durationMs + 5000);
    });
  });

  await Promise.all(connectionPromises);

  const overallEnd = performance.now();

  // Aggregate stats
  const establishmentTimes = perConnection.map((c) => c.establishedMs);
  const ttfbTimes = perConnection.filter((c) => c.ttfbMs > 0).map((c) => c.ttfbMs);
  const heartbeatCounts = perConnection.filter((c) => c.heartbeatsReceived > 0).map((c) => c.heartbeatsReceived);

  const result: SSEBenchmarkResult = {
    config: { numConnections, durationMs },
    summary: {
      successfulConnections,
      failedConnections,
      connectionEstablishment: computeLatencyStats(establishmentTimes),
      timeToFirstByte: computeLatencyStats(ttfbTimes),
      heartbeatReceived: computeLatencyStats(heartbeatCounts),
    },
    perConnection,
  };

  console.log(`[Benchmark:sse] Completed: ${successfulConnections} success, ${failedConnections} failed, avg establishment: ${result.summary.connectionEstablishment.avg.toFixed(1)}ms, avg TTFB: ${result.summary.timeToFirstByte.avg.toFixed(1)}ms`);

  sendSuccess<SSEBenchmarkResult>({
    reply,
    statusCode: 200,
    message: "SSE benchmark completed",
    data: result,
  });
}

// ─── Account Fetch Handler ──────────────────────────────────────

/**
 * GET /api/performance/benchmark/accounts/:userId
 *
 * Returns the user's accounts for configuring the benchmark.
 */
export async function benchmarkAccountsHandler(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply,
) {
  try {
    const { userId } = request.params;
    const accounts = await walletService.getUserAccounts(userId as TUserId);

    const accountDTOs = accounts.map((a) => ({
      id: String(a.accountNumber),
      name: a.name,
      accountNumber: String(a.accountNumber),
      balance: a.balance,
    }));

    sendSuccess({
      reply,
      statusCode: 200,
      message: "Accounts fetched",
      data: accountDTOs,
    });
  } catch (error) {
    sendError({
      reply,
      statusCode: 500,
      message: "FAILED_TO_FETCH_ACCOUNTS",
      error: error instanceof Error ? error.message : "INTERNAL_SERVER_ERROR",
    });
  }
}
