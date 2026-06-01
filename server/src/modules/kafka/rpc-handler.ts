import type { FastifyRequest, FastifyReply } from "fastify";
import { kafkaRPCProcedures, type KafkaRPCContext } from "./rpc-routes";
import type { IKafkaService } from "./kafka-service.interface";

/**
 * HTTP RPC Handler for Kafka procedures
 * Bridges HTTP requests to RPC procedures via Fastify
 * Supports both `/rpc/kafka/procedure` and `/rpc/kafka` with method in body
 */
export class KafkaHTTPRPCHandler {
  private context: KafkaRPCContext;

  constructor(kafkaService: IKafkaService) {
    this.context = { kafkaService };
  }

  /**
   * Handle HTTP POST request to RPC procedure
   * Path format: POST /rpc/kafka/:procedure
   * Body: JSON input matching procedure schema
   */
  async handle(req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { procedure } = req.params as { procedure: string };

    // Validate procedure exists
    const proc = (kafkaRPCProcedures as Record<string, any>)[procedure];
    if (!proc) {
      reply.status(404).send({
        error: "Procedure not found",
        procedure,
      });
      return;
    }

    // Validate input against procedure schema
    const input = req.body;
    try {
      const validated = await proc.input.parseAsync(input);

      // Execute procedure
      await proc.handler(validated, this.context);

      // Success response
      reply.status(200).send({
        success: true,
        procedure,
        message: `${procedure} executed successfully`,
      });
    } catch (error) {
      if (error instanceof Error) {
        reply.status(400).send({
          error: "Validation or execution error",
          procedure,
          message: error.message,
        });
      } else {
        reply.status(500).send({
          error: "Unknown error",
          procedure,
        });
      }
    }
  }

  /**
   * Get available procedures (introspection endpoint)
   */
  getProcedures() {
    return Object.keys(kafkaRPCProcedures);
  }
}

export function createKafkaHTTPRPCHandler(
  kafkaService: IKafkaService
): KafkaHTTPRPCHandler {
  return new KafkaHTTPRPCHandler(kafkaService);
}
