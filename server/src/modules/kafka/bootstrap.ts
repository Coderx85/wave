import { KafkaService } from "./kafka-service";
import { createKafkaRPCServer } from "./rpc-server";
import { initializeKafkaRPCClient } from "./rpc-client";
import { Logger } from "@/lib/logger";

const logger = Logger("KafkaBootstrap");

let kafkaService: KafkaService | null = null;
let isInitialized = false;

/**
 * Initialize the Kafka RPC server and client at application startup
 * This must be called once before any module tries to use the kafkaRPCClient
 */
export async function initializeKafkaRPC(): Promise<void> {
  if (isInitialized) {
    logger.info("Kafka RPC already initialized");
    return;
  }

  try {
    logger.info("Initializing Kafka RPC...");
    
    // Create Kafka service instance
    kafkaService = new KafkaService();
    
    // Create and initialize RPC server
    const rpcServer = createKafkaRPCServer(kafkaService);
    
    // Initialize RPC client with server instance
    initializeKafkaRPCClient(rpcServer);
    
    isInitialized = true;
    logger.info("Kafka RPC initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize Kafka RPC", error);
    throw error;
  }
}

/**
 * Get the initialized Kafka service instance
 * Use only for testing or direct access if needed
 */
export function getKafkaService(): KafkaService {
  if (!kafkaService) {
    throw new Error("Kafka service not initialized. Call initializeKafkaRPC first.");
  }
  return kafkaService;
}

/**
 * Check if Kafka RPC is initialized
 */
export function isKafkaRPCInitialized(): boolean {
  return isInitialized;
}
