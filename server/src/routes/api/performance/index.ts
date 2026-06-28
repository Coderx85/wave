import type { FastifyInstance } from "fastify";
import { performanceRoutes } from "./definition";
import {
  benchmarkTransfersHandler,
  benchmarkConcurrentTransfersHandler,
  benchmarkSSEHandler,
  benchmarkAccountsHandler,
} from "./handler";

export default async function performanceRoute(fastify: FastifyInstance) {
  fastify.post(performanceRoutes.benchmarkTransfers, {
    handler: benchmarkTransfersHandler,
  });

  fastify.post(performanceRoutes.benchmarkConcurrentTransfers, {
    handler: benchmarkConcurrentTransfersHandler,
  });

  fastify.post(performanceRoutes.benchmarkSSE, {
    handler: benchmarkSSEHandler,
  });

  fastify.get(`${performanceRoutes.benchmarkAccounts}/:userId`, {
    handler: benchmarkAccountsHandler,
  });
}
