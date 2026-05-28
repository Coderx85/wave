import type { ITransactionRepository, ITransaction } from "../transaction.interface";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { TransactionsTable, AccountsTable } from "@/modules/database/schema/transaction.repository";
import { db } from "@/modules/database/client";

const TransactionSampleCollection: ITransaction[] = [];

export class TransactionRepository implements ITransactionRepository {
  async save(transaction: ITransaction): Promise<void> {
    return tryCatch({
      ctx: async () => {
        await db
          .insert(TransactionsTable)
          .values({
            ...transaction,
            amount: transaction.amount.toString(),
            status: "pending",
            createdAt: new Date(),
          });
      }
    });
  };

  async findById(transactionId: string): Promise<ITransaction | null> {
    throw new Error("Method not implemented.");
  };

  async findByUserId(userId: string): Promise<ITransaction[]> {
    throw new Error("Method not implemented.");
  };

  failedTransactions(): Promise<ITransaction[]> {
    throw new Error("Method not implemented.");
  };

  successfulTransactions(): Promise<ITransaction[]> {
    throw new Error("Method not implemented.");
  };

  delete(transactionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

}