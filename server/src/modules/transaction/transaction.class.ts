import type { ITransactionModule, ITransaction, ITransactionRepository } from "./transaction.interface";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { ID } from "@/lib/ID";


export class TransactionModule implements ITransactionModule {
  private transactionRepository: ITransactionRepository;
  
  create(transaction: Omit<ITransaction, "id" | "status">): Promise<ITransaction> {
    return tryCatch(() => {
      ctx: async () => {
        const newTransaction: ITransaction = {
          id: ID.TransactionId(),
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
        };
        await this.transactionRepository.save(newTransaction);
        return newTransaction;
      }
    })  
  };

  list(userId: string): Promise<ITransaction[]> {
    throw new Error("Method not implemented.");
  }
  query(query: { status?: "success" | "failed"; dateRange?: { from: Date; to: Date; }; }): Promise<ITransaction[]> {
    throw new Error("Method not implemented.");
  }
  delete(transactionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

}