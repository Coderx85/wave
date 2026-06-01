import type { ITransactionEvent, IKafkaService } from "./kafka-service.interface";
import { Logger } from "@/lib/logger";

const logger = Logger("KafkaRPCClient");

/**
 * Local in-process RPC client for Kafka service
 * This allows other modules to call kafka RPC procedures without direct imports
 */
let rpcServer: any = null;

/**
 * Initialize the RPC client with server instance
 * Must be called after RPC server is created
 */
export function initializeKafkaRPCClient(server: any) {
  rpcServer = server;
  logger.info("Kafka RPC client initialized");
}

/**
 * RPC Client wrapper that implements IKafkaService interface
 * Provides typed access to kafka RPC procedures
 */
export const kafkaRPCClient: IKafkaService = {
  async connect(): Promise<void> {
    if (!rpcServer) {
      throw new Error("Kafka RPC client not initialized");
    }
    try {
      await rpcServer.call("connect", undefined);
    } catch (error) {
      logger.error("RPC call failed: connect", error);
      throw error;
    }
  },

  async disconnect(): Promise<void> {
    if (!rpcServer) {
      throw new Error("Kafka RPC client not initialized");
    }
    try {
      await rpcServer.call("disconnect", undefined);
    } catch (error) {
      logger.error("RPC call failed: disconnect", error);
      throw error;
    }
  },

  async publishTransactionEvent(event: ITransactionEvent): Promise<void> {
    if (!rpcServer) {
      throw new Error("Kafka RPC client not initialized");
    }
    try {
      await rpcServer.call("publishTransactionEvent", event);
    } catch (error) {
      logger.error("RPC call failed: publishTransactionEvent", error);
      throw error;
    }
  },
};
