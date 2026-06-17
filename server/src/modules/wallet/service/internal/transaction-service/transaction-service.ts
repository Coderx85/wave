import type { 
  ITransactionModule, 
  ITransaction, 
  TransactionInput,
  TTransactionQuery
} from "./transaction-service.interface";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { ID } from "@/lib/ID";
import {
  TransactionRepository,
  type ITransactionRepository, 
  type IAccountRepository,
  OutboxRepository,
  type IOutboxRepository,
}  from "../../../repository";
import { IdempotencyManager } from "../../../utils";
import { kafkaRPCClient, type IKafkaService } from "../../../../kafka";
import type { TUserId } from "@/types";
import { TBAccountRepository } from "@/modules/wallet/repository/account.repository";

export class TransactionModule implements ITransactionModule {
  private transactionRepository: ITransactionRepository;
  private accountRepository: IAccountRepository;
  private outboxRepository: IOutboxRepository;
  private kafkaService: IKafkaService;

  constructor(
    transactionRepository: ITransactionRepository = new TransactionRepository(),
    accountRepository: IAccountRepository = new TBAccountRepository(),
    outboxRepository: IOutboxRepository = new OutboxRepository(),
    kafkaService: IKafkaService = kafkaRPCClient,
  ) {
    this.transactionRepository = transactionRepository;
    this.accountRepository = accountRepository;
    this.outboxRepository = outboxRepository;
    this.kafkaService = kafkaService;
  }
  
  create(transaction: TransactionInput): Promise<ITransaction> {
    const totalAmount = transaction.amount;

    // Generate idempotency key for this transaction to prevent duplicates
    const idempotencyKey = IdempotencyManager.generateTransactionKey(
      transaction.receiverName.toString(),
      transaction.receiverAccountNumber.toString(),
      totalAmount
    );

    return tryCatch({
      ctx: async () => {
        await this.accountRepository.adjustBalance(transaction.senderAccountNumber, -totalAmount);
        await this.accountRepository.adjustBalance(transaction.receiverAccountNumber, totalAmount);

        const newTransaction: ITransaction = {
          id: ID.TransactionId(),
          ...transaction,
          amount: BigInt(transaction.amount),
          status: "pending",
          createdAt: new Date(),
          updatedAt: null,
        };

        await this.transactionRepository.save({
          ...newTransaction,
        });

        // Create outbox entry for event publishing
        const event = {
          eventType: "transaction.created" as const,
          transactionId: newTransaction.id,
          userId: newTransaction.userId,
          senderAccountNumber: newTransaction.senderAccountNumber,
          receiverAccountNumber: newTransaction.receiverAccountNumber,
          amount: totalAmount.toString(),
          senderName: newTransaction.senderName,
          receiverName: newTransaction.receiverName,
          status: newTransaction.status,
          timestamp: new Date().toISOString(),
        };

        await this.outboxRepository.create({
          transactionId: newTransaction.id,
          eventType: "transaction.created",
          payload: event,
          published: false,
          publishedAt: null,
        });

        // Publish event to Kafka asynchronously (don't block on publish)
        this.kafkaService
          .publishTransactionEvent(event)
          .then(() => {
            // Mark as published after successful publish
            this.outboxRepository.markAsPublished(newTransaction.id);
          })
          .catch((error) => {
            console.error(`Failed to publish transaction event: ${error}`);
            // In production, this should be handled by a background job
            // that periodically retries unpublished events
          });
        
        return newTransaction;
      },
      errorMessage: "FAILED_TO_CREATE_TRANSACTION", 
    });
  };

  list(userId: TUserId): Promise<ITransaction[]> {
    return tryCatch({
      ctx: async () => {
        const transactions = await this.transactionRepository.findByUserId(userId);
        return transactions;
      },
      errorMessage: "FAILED_TO_LIST_TRANSACTIONS",
    });
  }

  query(
    query: TTransactionQuery,
    userId: TUserId
): Promise<ITransaction[]> {
    return tryCatch({
      ctx: async () => {
        switch (query.status) {
          case "success":
            const successfulTransactions = await this.transactionRepository.successfulTransactions({
              userId,
              dateRange: query.dateRange,
            });
            return successfulTransactions;

          case "failed":
            const failedTransactions = await this.transactionRepository.failedTransactions({
              userId,
              dateRange: query.dateRange
            });
            return failedTransactions;
          
          default:
            throw new Error("Invalid status value. Allowed values are 'success' or 'failed'.");
        }
      },
      errorMessage: "FAILED_TO_QUERY_TRANSACTIONS",
    });
  }
}