import type { ITransactionDBDTO, ITransactionRepository } from "./transaction-repo.interface";
import { CachedRepository, type DrizzleDb } from "@/lib/repository/base-repository";
import { TransactionsTable } from "@/modules/database/schema/transaction.repository";
import { eq, sql } from "drizzle-orm";
import type { TBankAccountNumber, TTransactionId, TUserId } from "@/types";
import type { ICacheStore } from "@/lib/cache";

export class TransactionRepository extends CachedRepository implements ITransactionRepository {
  constructor(dbInstance?: DrizzleDb, cacheStore?: ICacheStore) {
    super(dbInstance, cacheStore);
  }

  private getTransactionCacheKey(transactionId: TTransactionId): string {
    return this.getCacheKey("transaction", transactionId);
  }

  private getUserTransactionsCacheKey(userId: TUserId): string {
    return this.getCacheKey("user-transactions", userId);
  }

  async save(transaction: ITransactionDBDTO): Promise<void> {
    await this.run(async () => {
      await this.db
        .transaction(
          async (tx) => {
            await tx.insert(TransactionsTable)
              .values({
              ...transaction,
              status: "pending",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        )
    }, "FAILED_TO_SAVE_TRANSACTION");

    await this.cache.del(this.getUserTransactionsCacheKey(transaction.userId));
  }

  async update(transaction: ITransactionDBDTO): Promise<ITransactionDBDTO> {
    const updatedTransaction = await this.run(async () => {
      const [result] = await this.db.update(TransactionsTable)
        .set({
          ...transaction,
          updatedAt: new Date(),
        })
        .where(eq(TransactionsTable.id, transaction.id))
        .returning();

      if (!result) {
        throw new Error(`Failed to update transaction with id: ${transaction.id}`);
      }

      return result;
    }, "FAILED_TO_UPDATE_TRANSACTION");
    
    await this.cache.del(this.getTransactionCacheKey(updatedTransaction.id));
    await this.cache.del(this.getUserTransactionsCacheKey(updatedTransaction.userId));

    return updatedTransaction;
  }

  findById(transactionId: TTransactionId): Promise<ITransactionDBDTO | null> {
    const cacheKey = this.getTransactionCacheKey(transactionId);
    return this.cache.getOrSet(cacheKey, () => {
      return this.run(async () => {
        const transaction = await this.db.query.TransactionsTable.findFirst({
          where: {
            id: { eq: transactionId },
          },
        });
        return transaction || null;
      }, "FAILED_TO_FIND_TRANSACTION_BY_ID");
    }, 3600);
  }

  findByUserId(userId: TUserId): Promise<ITransactionDBDTO[]> {
    const cacheKey = this.getUserTransactionsCacheKey(userId);
    return this.cache.getOrSet(cacheKey, () => {
        return this.run(async () => {
            const transactions = await this.db.query.TransactionsTable.findMany({
              where: {
                userId: { eq: userId },
              },
            });
            return transactions;
          }, "FAILED_TO_FIND_TRANSACTIONS_BY_USER_ID");
    }, 3600);
  }

  async failedTransactions(query: { userId: TUserId; accountNumber?: TBankAccountNumber; dateRange?: { from: Date; to: Date; }; }): Promise<ITransactionDBDTO[]> {
    return this.run(async () => {
        const { userId, accountNumber, dateRange } = query;
        const whereClauses: any[] = [];
  
        if (dateRange) {
          whereClauses.push({ RAW: (table: any) => sql`${table.createdAt} BETWEEN ${dateRange.from} AND ${dateRange.to}` });
        }
  
        if (accountNumber) {
          whereClauses.push({ RAW: (table: any) => sql`${table.senderAccountNumber} = ${accountNumber} OR ${table.receiverAccountNumber} = ${accountNumber}` });
        }
  
        const transactions = await this.db.query.TransactionsTable.findMany({
          orderBy: { createdAt: "asc" },
          offset: 0,
          limit: 10,
          where: {
            AND: whereClauses,
            userId: { eq: userId },
            status: { eq: "failed" },
          },
        });
        
        return transactions ?? [];
      }, "FAILED_TO_GET_FAILED_TRANSACTIONS");
  }

  async successfulTransactions(query: { 
    userId: TUserId; 
    accountNumber?: TBankAccountNumber; 
    dateRange?: { 
      from: Date; 
      to: Date; 
    }; 
  }): Promise<ITransactionDBDTO[]> {
    return this.run(async () => {
        const { userId, accountNumber, dateRange } = query;
        const whereClauses: any[] = [];
  
        if (dateRange) {
          whereClauses.push({ RAW: (table: any) => sql`${table.createdAt} BETWEEN ${dateRange.from} AND ${dateRange.to}` });
        }
  
        if (accountNumber) {
          whereClauses.push({ RAW: (table: any) => sql`${table.senderAccountNumber} = ${accountNumber} OR ${table.receiverAccountNumber} = ${accountNumber}` });
        }
  
        const transactions = await this.db.query.TransactionsTable.findMany({
          orderBy: { createdAt: "desc" },
          offset: 0,
          limit: 10,
          where: {
            userId: { eq: userId },
            status: { eq: "success" },
            AND: whereClauses
          }
        });
        
        return transactions ?? [];
      }, "FAILED_TO_GET_SUCCESSFUL_TRANSACTIONS");
  }
}
