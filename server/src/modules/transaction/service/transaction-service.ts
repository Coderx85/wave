import type { 
  ITransactionModule, 
  ITransaction, 
} from "./transaction-service.interface";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { ID } from "@/lib/ID";
import { TransactionRepository, type ITransactionRepository } from "../repository";

export class TransactionModule implements ITransactionModule {
  private transactionRepository: ITransactionRepository = new TransactionRepository();
  
  create(transaction: Omit<ITransaction, "id" | "status">): Promise<ITransaction> {
    return tryCatch({
      ctx: async () => {
        const newTransaction: ITransaction = {
          id: ID.TransactionId(),
          ...transaction,
          status: "pending"
        };

        await this.transactionRepository.save(newTransaction);
        
        return newTransaction;
      },
      errorMessage: "FAILED_TO_CREATE_TRANSACTION", 
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