import type { ITransactionDBDTO, ITransactionRepository } from "../repository";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { TransactionsTable } from "@/modules/database/schema/transaction.repository";
import { db } from "@/modules/database/client";
import type { SQL } from "drizzle-orm";
import { eq, between, or } from "drizzle-orm";

export class TransactionRepository implements ITransactionRepository {
  async save(transaction: ITransactionDBDTO): Promise<void> {
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

  async findById(transactionId: ITransactionDBDTO["id"]): Promise<ITransactionDBDTO | null> {
    return tryCatch({
      ctx: async () => {
        const transaction = await db.query.TransactionsTable.findFirst({
          where(fields, operators) {
            return operators.eq(fields.id, transactionId);
          },
        });
        return transaction || null;
      }
    })
  };

  async findByUserId(userId: ITransactionDBDTO["userId"]): Promise<ITransactionDBDTO[]> {
    return tryCatch({
      ctx: async () => {
        const transactions = await db.query.TransactionsTable.findMany({
          where(fields, operators) {
            return operators.eq(fields.userId, userId);
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

    return tryCatch({
      ctx: async () => {
        const whereClauses: Array<SQL<unknown> | undefined> = [
          eq(TransactionsTable.userId, userId),
          eq(TransactionsTable.status, "failed")
        ];

        if (dateRange) {
          whereClauses.push(
            between(TransactionsTable.createdAt, dateRange.from, dateRange.to)
          );
        }

        if (accountId) {
          whereClauses.push(
            or(
              eq(TransactionsTable.senderAccountId, accountId),
              eq(TransactionsTable.receiverAccountId, accountId)
            )
          );
        }

        const transactions = await db.query.TransactionsTable.findMany({
          orderBy(fields, operators) {
            return operators.desc(fields.createdAt);
          },
          offset: 0,
          limit: 10,
          where(fields, operators) {
            return operators.and(...whereClauses);
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
        const whereClauses: Array<SQL<unknown> | undefined> = [
          eq(TransactionsTable.userId, userId),
          eq(TransactionsTable.status, "success")
        ];

        if (dateRange) {
          whereClauses.push(
            between(TransactionsTable.createdAt, dateRange.from, dateRange.to)
          );
        }

        if (accountId) {
          whereClauses.push(
            or(
              eq(TransactionsTable.senderAccountId, accountId),
              eq(TransactionsTable.receiverAccountId, accountId)
            )
          );
        }

        const transactions = await db.query.TransactionsTable.findMany({
          orderBy(fields, operators) {
            return operators.desc(fields.createdAt);
          },
          offset: 0,
          limit: 10,
          where(fields, operators) {
            return operators.and(...whereClauses);
          }
        });
        
        return transactions ?? [];
      }
    });
  };
}