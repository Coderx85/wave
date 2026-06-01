import type { FastifyInstance } from "fastify";
import { getKafkaService } from "@/modules/kafka";
import { createKafkaHTTPRPCHandler } from "@/modules/kafka/rpc-handler";

/**
 * HTTP RPC endpoints for Kafka module
 * Exposes: POST /rpc/kafka/:procedure
 * Example: POST /rpc/kafka/publishTransactionEvent
 */
export default async function kafkaRPCRoutes(fastify: FastifyInstance) {
  const kafkaService = getKafkaService();
  const handler = createKafkaHTTPRPCHandler(kafkaService);

  // POST /rpc/kafka/:procedure - Execute RPC procedure
  fastify.post<{ Params: { procedure: string } }>(
    "/rpc/kafka/:procedure",
    async (req, reply) => {
      await handler.handle(req, reply);
    }
  );

  // GET /rpc/kafka - List available procedures
  fastify.get("/rpc/kafka", async (_req, reply) => {
    reply.status(200).send({
      service: "Kafka RPC",
      procedures: handler.getProcedures(),
      usage: "POST /rpc/kafka/:procedure with JSON body",
    });
  });
}
