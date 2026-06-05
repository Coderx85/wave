import { eq } from "drizzle-orm";
import { CompositeRepository, type IPostgresStore, type ICacheStore } from "@/lib/repository";
import { TransactionsTable } from "@/modules/database/schema/transaction.repository";
import type { TTransactionId, TUserId } from "@/types";
import type { ITransactionDTO, TransactionQuery, ITransactionRepository } from "./contracts";

type StoreOpts = { pg?: IPostgresStore; cache?: ICacheStore };

export class TransactionRepository extends CompositeRepository implements ITransactionRepository {
  constructor(opts?: StoreOpts) { super(opts); }

  private txCacheKey(id: TTransactionId): string {
    return this.cacheKey("transaction", id);
  }

  private userTxCacheKey(userId: TUserId): string {
    return this.cacheKey("user-transactions", userId);
  }

  async save(transaction: ITransactionDTO): Promise<void> {
    await this.pg.run(async () => {
      await this.pg.client.insert(TransactionsTable).values({
        ...transaction,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }, "FAILED_TO_SAVE_TRANSACTION");
    await this.cache.del(this.userTxCacheKey(transaction.userId));
  }

  async update(transaction: ITransactionDTO): Promise<ITransactionDTO> {
    const updated = await this.pg.run(async () => {
      const [row] = await this.pg.client
        .update(TransactionsTable)
        .set({ ...transaction, updatedAt: new Date() })
        .where(eq(TransactionsTable.id, transaction.id))
        .returning();
      if (!row) throw new Error(`Transaction ${transaction.id} not found`);
      return row;
    }, "FAILED_TO_UPDATE_TRANSACTION");

    await this.cache.del(this.txCacheKey(updated.id));
    await this.cache.del(this.userTxCacheKey(updated.userId));
    return updated;
  }

  findById(transactionId: TTransactionId): Promise<ITransactionDTO | null> {
    return this.cache.getOrSet(this.txCacheKey(transactionId), () =>
      this.pg.run(async () => {
        const row = await this.pg.client.query.TransactionsTable.findFirst({
          where: { id: { eq: transactionId } },
        });
        return row ?? null;
      }, "FAILED_TO_FIND_TRANSACTION"),
    3600);
  }

  findByUserId(userId: TUserId): Promise<ITransactionDTO[]> {
    return this.cache.getOrSet(this.userTxCacheKey(userId), () =>
      this.pg.run(async () => {
        return await this.pg.client.query.TransactionsTable.findMany({
          where: { userId: { eq: userId } },
        });
      }, "FAILED_TO_FIND_TRANSACTIONS_BY_USER"),
    3600);
  }

  async failedTransactions(query: TransactionQuery): Promise<ITransactionDTO[]> {
    return this.pg.run(async () => {
      const { userId, accountNumber } = query;
      return await this.pg.client.query.TransactionsTable.findMany({
        where: {
          userId: { eq: userId },
          status: { eq: "failed" },
          ...(accountNumber
            ? {
                OR: [
                  { senderAccountNumber: { eq: accountNumber } },
                  { receiverAccountNumber: { eq: accountNumber } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "asc" },
        limit: 10,
      });
    }, "FAILED_TO_GET_FAILED_TRANSACTIONS");
  }

  async successfulTransactions(query: TransactionQuery): Promise<ITransactionDTO[]> {
    return this.pg.run(async () => {
      const { userId, accountNumber } = query;
      return await this.pg.client.query.TransactionsTable.findMany({
        where: {
          userId: { eq: userId },
          status: { eq: "success" },
          ...(accountNumber
            ? {
                OR: [
                  { senderAccountNumber: { eq: accountNumber } },
                  { receiverAccountNumber: { eq: accountNumber } },
                ],
              }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        limit: 10,
      });
    }, "FAILED_TO_GET_SUCCESSFUL_TRANSACTIONS");
  }
}
