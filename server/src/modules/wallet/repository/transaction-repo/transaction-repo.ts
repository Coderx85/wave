import type { ITransactionDBDTO, ITransactionRepository } from "./transaction-repo.interface";
import { db } from "@/modules/database/client";
import { BaseRepository, type DrizzleDb } from "@/lib/repository/base-repository";
import { TransactionsTable } from "@/modules/database/schema/transaction.repository";
import { eq, sql } from "drizzle-orm";

export class TransactionRepository extends BaseRepository implements ITransactionRepository {
  constructor(dbInstance?: DrizzleDb) {
    super(dbInstance || db);
  }

  async save(transaction: ITransactionDBDTO): Promise<void> {
    await this.run(async () => {
      await this.db
        .transaction(
          async (tx) => {
            // 1. Insert the transaction.
            await tx.insert(TransactionsTable)
              .values({
                ...transaction,
                status: "pending", // Always set new transactions to pending
                createdAt: new Date(),
                updatedAt: new Date(),
                });
          }
        )
    }, "FAILED_TO_SAVE_TRANSACTION");
  }

  async update(transaction: ITransactionDBDTO): Promise<ITransactionDBDTO> {
    return this.run(async () => {
      const [updatedTransaction] = await this.db.update(TransactionsTable)
        .set({
          ...transaction,
          updatedAt: new Date(),
        })
        .where(eq(TransactionsTable.id, transaction.id))
        .returning();

      if (!updatedTransaction) {
        throw new Error(`Failed to update transaction with id: ${transaction.id}`);
      }

      return updatedTransaction;
    }, "FAILED_TO_UPDATE_TRANSACTION");
  }

  async findById(transactionId: ITransactionDBDTO["id"]): Promise<ITransactionDBDTO | null> {
    return this.run(async () => {
      const transaction = await this.db.query.TransactionsTable.findFirst({
        where: {
          id: {
            eq: transactionId
          },
        }
      });

      return transaction || null;
    }, "FAILED_TO_FIND_TRANSACTION_BY_ID");
  }

  async findByUserId(userId: ITransactionDBDTO["userId"]): Promise<ITransactionDBDTO[]> {
    return this.run(async () => {
      const transactions = await this.db.query.TransactionsTable.findMany({
        where: {
          userId: {
            eq: userId
          }
        }
      });
      return transactions;
    }, "FAILED_TO_FIND_TRANSACTIONS_BY_USER_ID");
  }

  async failedTransactions(
    query: {
      userId: ITransactionDBDTO["userId"], 
      accountId?: ITransactionDBDTO["senderAccountId"] | ITransactionDBDTO["receiverAccountId"],
      dateRange?: { from: Date; to: Date }
    }
  ): Promise<ITransactionDBDTO[]> {
    return this.run(async () => {
      const { userId, accountId, dateRange } = query;
      
      const whereClauses: any[] = [];

      if (dateRange) {
        whereClauses.push(
          { 
            RAW: (table: any) => sql`${table.senderAccountId} = ${accountId} OR ${table.receiverAccountId} = ${accountId}` 
          }
        );
      }

      if (accountId) {
        whereClauses.push(
          {
            RAW: (table: any) => sql`${table.senderAccountId} = ${accountId} OR ${table.receiverAccountId} = ${accountId}`
          }
        );
      }

      const transactions = await this.db.query.TransactionsTable.findMany({
        orderBy: {
          createdAt:"asc",
        },
        offset: 0,
        limit: 10,
        where: {
          AND: [
            ...whereClauses
          ],
          userId: {
            eq: userId
          },
          status: {
            eq: "failed"
          }
        },
      });
      
      return transactions ?? [];
    }, "FAILED_TO_GET_FAILED_TRANSACTIONS");
  }

  async successfulTransactions(query: {
    userId: ITransactionDBDTO["userId"],
    accountId?: ITransactionDBDTO["senderAccountId"] | ITransactionDBDTO["receiverAccountId"],
    dateRange?: { from: Date; to: Date }
  }): Promise<ITransactionDBDTO[]> {
    return this.run(async () => {
      const { userId, accountId, dateRange } = query;
      const whereClauses: any[] = [];

      if (dateRange) {
        whereClauses.push(
          {
            RAW: (table: any) => sql`${table.createdAt} BETWEEN ${dateRange.from} AND ${dateRange.to}`
          }
        );
      }

      if (accountId) {
        whereClauses.push(
          {
            RAW: (table: any) => sql`${table.senderAccountId} = ${accountId} OR ${table.receiverAccountId} = ${accountId}`
          }
        );
      }

      const transactions = await this.db.query.TransactionsTable.findMany({
        orderBy: {
          createdAt: "desc"
        },
        offset: 0,
        limit: 10,
        where: {
          userId: {
            eq: userId
          },
          status: {
            eq: "success"
          },
          AND: [
            ...whereClauses
          ]
        }
      });
      
      return transactions ?? [];
    }, "FAILED_TO_GET_SUCCESSFUL_TRANSACTIONS");
  }
}
