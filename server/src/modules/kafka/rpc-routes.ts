import { z } from "zod";
import type { ITransactionEvent, IKafkaService } from "./kafka-service.interface";
import type { TBankAccountNumber } from "@/types/id.types";

// Zod schemas for type-safe RPC procedures
const TransactionEventSchema = z.object({
  eventType: z.literal("transaction.created"),
  transactionId: z.string(),
  userId: z.string(),
  senderAccountNumber: z.transform(
    (val) => val as unknown as TBankAccountNumber
  ),
  receiverAccountNumber: z.transform(
    (val) => val as unknown as TBankAccountNumber
  ),
  amount: z.string(),
  senderName: z.string(),
  receiverName: z.string(),
  status: z.string(),
  timestamp: z.string(),
}) satisfies z.ZodType<ITransactionEvent>;

export interface KafkaRPCContext {
  kafkaService: IKafkaService;
}

/**
 * Define typed RPC procedures for Kafka service
 * These procedures provide a well-defined interface for inter-module communication
 */
export const kafkaRPCProcedures = {
  connect: {
    input: z.void(),
    async handler(_input: undefined, context: KafkaRPCContext) {
      await context.kafkaService.connect();
    },
  },

  disconnect: {
    input: z.void(),
    async handler(_input: undefined, context: KafkaRPCContext) {
      await context.kafkaService.disconnect();
    },
  },

  publishTransactionEvent: {
    input: TransactionEventSchema,
    async handler(event: ITransactionEvent, context: KafkaRPCContext) {
      await context.kafkaService.publishTransactionEvent(event);
    },
  },
};

