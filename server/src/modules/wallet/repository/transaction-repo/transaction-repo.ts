import type { ITransactionDBDTO, ITransactionRepository } from "./transaction-repo.interface";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { TransactionsTable } from "@/modules/database/schema/transaction.repository";
import { db } from "@/modules/database/client";
import { eq, sql } from "drizzle-orm";

export class TransactionRepository implements ITransactionRepository {
  async save(transaction: ITransactionDBDTO): Promise<void> {
    return tryCatch({
      ctx: async () => {
        await db
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
      }
    });
  };

  // If the transaction is successful, update the record with status "success". 
  // If the transaction is in pending state for too long or fails, 
  // update the record with status "failed" with a cron job.
  async update(transaction: ITransactionDBDTO): Promise<ITransactionDBDTO> {
    return tryCatch({
      ctx: async () => {
        const [updatedTransaction] = await db.update(TransactionsTable)
          .set({
            ...transaction,
            updatedAt: new Date(),
          })
          .where(eq(TransactionsTable.id, transaction.id))
          .returning();

        if (!updatedTransaction) {
          throw new Error(`Failed to update transaction with id: ${transaction.id}`);
        }

        return updatedTransaction
      }
    })
  };

  async findById(transactionId: ITransactionDBDTO["id"]): Promise<ITransactionDBDTO | null> {
    return tryCatch({
      ctx: async () => {
        const transaction = await db.query.TransactionsTable.findFirst({
          where: {
            id: {
              eq: transactionId
            },
          }
        });

        return transaction || null;
      }
    })
  };

  async findByUserId(userId: ITransactionDBDTO["userId"]): Promise<ITransactionDBDTO[]> {
    return tryCatch({
      ctx: async () => {
        const transactions = await db.query.TransactionsTable.findMany({
          where: {
            userId: {
              eq: userId
            }
          },
        });
        return transactions;
      }
    })
  };

  async failedTransactions(
    query: {
      userId: ITransactionDBDTO["userId"], 
      accountId?: ITransactionDBDTO["senderAccountId"] | ITransactionDBDTO["receiverAccountId"],
      dateRange?: { from: Date; to: Date }
    }
  ): Promise<ITransactionDBDTO[]> {
    const { userId, accountId, dateRange } = query;
    
    // const whereClauses: Array<SQL<unknown> | undefined> = [
    //   eq(TransactionsTable.userId, userId),
    //   eq(TransactionsTable.status, "failed")
    // ];

    const whereClauses: any[] = []
    
    return tryCatch({
      ctx: async () => {
        
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

        const transactions = await db.query.TransactionsTable.findMany({
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
      }
    });
  };

  async successfulTransactions(query: {
    userId: ITransactionDBDTO["userId"],
    accountId?: ITransactionDBDTO["senderAccountId"] | ITransactionDBDTO["receiverAccountId"],
    dateRange?: { from: Date; to: Date }
  }): Promise<ITransactionDBDTO[]> {
    return tryCatch({
      ctx: async () => {
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

        const transactions = await db.query.TransactionsTable.findMany({
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
      }
    });
  };
}