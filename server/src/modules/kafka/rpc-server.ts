import { kafkaRPCProcedures, type KafkaRPCContext } from "./rpc-routes";
import type { IKafkaService } from "./kafka-service.interface";

/**
 * Kafka RPC Server - Manages RPC procedure execution
 * In-process implementation for local inter-module communication
 */
export class KafkaRPCServer {
  private context: KafkaRPCContext;

  constructor(kafkaService: IKafkaService) {
    this.context = { kafkaService };
  }

  /**
   * Execute an RPC procedure
   */
  async call(procedure: string, input: unknown): Promise<void> {
    const proc = (kafkaRPCProcedures as Record<string, any>)[procedure];
    if (!proc) {
      throw new Error(`Unknown procedure: ${procedure}`);
    }

    await proc.handler(input, this.context);
  }

  /**
   * Get the procedures for inspection/documentation
   */
  getProcedures() {
    return kafkaRPCProcedures;
  }
}

export function createKafkaRPCServer(kafkaService: IKafkaService): KafkaRPCServer {
  return new KafkaRPCServer(kafkaService);
}

export type KafkaRPC = KafkaRPCServer;
