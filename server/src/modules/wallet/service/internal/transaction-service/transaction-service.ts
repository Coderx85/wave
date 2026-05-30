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
  AccountRepository, 
  type IAccountRepository,
}  from "../../repository";
import { IdempotencyManager } from "../../utils";
import type { TUserId } from "@/types";

export class TransactionModule implements ITransactionModule {
  private transactionRepository: ITransactionRepository = new TransactionRepository();
  private accountRepository: IAccountRepository = new AccountRepository();
  
  create(transaction: TransactionInput): Promise<ITransaction> {
    const totalAmount = transaction.amount;

    // Generate idempotency key for this transaction to prevent duplicates
    const idempotencyKey = IdempotencyManager.generateTransactionKey(
      transaction.senderAccountId.toString(),
      transaction.receiverAccountId.toString(),
      totalAmount
    );

    return tryCatch({
      ctx: async () => {
        await this.accountRepository.adjustBalance(transaction.senderAccountId, -totalAmount);
        await this.accountRepository.adjustBalance(transaction.receiverAccountId, totalAmount);

        const newTransaction: ITransaction = {
          id: ID.TransactionId(),
          ...transaction,
          amount: BigInt(transaction.amount),
          status: "pending"
        };

        await this.transactionRepository.save({
          ...newTransaction,
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