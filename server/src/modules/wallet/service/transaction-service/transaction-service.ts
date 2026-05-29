import type { 
  ITransactionModule, 
  ITransaction, 
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
import type { TUserId } from "@/types";

export class TransactionModule implements ITransactionModule {
  private transactionRepository: ITransactionRepository = new TransactionRepository();
  private accountRepository: IAccountRepository = new AccountRepository();
  
  create(transaction: Omit<ITransaction, "id" | "status">): Promise<ITransaction> {
    const totalAmount = transaction.amount;

    tryCatch({
      ctx: async () => {
        // 1. Calculate the total amount to be debited from the sender's account
        await this.accountRepository.calculateNewBalance(transaction.senderAccountId, totalAmount);
      },
      errorMessage: "FAILED_TO_CALCULATE_NEW_BALANCE",
    });
     
    tryCatch({
      ctx: async () => {
        // 3. Update the sender's account balance
        const senderNewBalance = await this.accountRepository.calculateNewBalance(transaction.senderAccountId, -totalAmount);
        await this.accountRepository.updateBalance(transaction.senderAccountId, senderNewBalance);
        
        // 4. Update the receiver's account balance
        const receiverNewBalance = await this.accountRepository.calculateNewBalance(transaction.receiverAccountId, totalAmount);
        await this.accountRepository.updateBalance(transaction.receiverAccountId, receiverNewBalance);
      },
      errorMessage: "FAILED_TO_UPDATE_ACCOUNT_BALANCES",
    });

    return tryCatch({
      ctx: async () => {
        // 2. Calculate the total amount to be credited to the receiver's account
        const newTransaction: ITransaction = {
          id: ID.TransactionId(),
          ...transaction,
          status: "pending"
        };

        await this.transactionRepository.save({
          ...newTransaction,
          amount: BigInt(newTransaction.amount),
        });
        
        return newTransaction;
      },
      errorMessage: "FAILED_TO_CREATE_TRANSACTION", 
    })
  };

  list(userId: TUserId): Promise<ITransaction[]> {
    return tryCatch({
      ctx: async () => {
        const transactions = await this.transactionRepository.findByUserId(userId);
        return transactions.map(tx => ({
          ...tx,
          amount: Number(tx.amount),
        }));
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
            return successfulTransactions.map(tx => ({
              ...tx,
              amount: Number(tx.amount),
            }));

          case "failed":
            const failedTransactions = await this.transactionRepository.failedTransactions({
              userId,
              dateRange: query.dateRange
            });
            return failedTransactions.map(tx => ({
              ...tx,
              amount: Number(tx.amount),
            }));
          
          default:
            throw new Error("Invalid status value. Allowed values are 'success' or 'failed'.");
        }
      },
      errorMessage: "FAILED_TO_QUERY_TRANSACTIONS",
    });
  }
}