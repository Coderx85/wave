import { desc, eq } from "drizzle-orm";
import { CompositeRepository, type IPostgresStore, type ICacheStore } from "@/lib/repository";
import { TransactionOutboxTable } from "@/modules/database/schema/transaction-outbox.repository";
import { ID } from "@/lib/ID";
import type { TTransactionId } from "@/types";
import type { IOutboxEntry, IOutboxRepository } from "./contracts";

type StoreOpts = { pg?: IPostgresStore; cache?: ICacheStore };

export class OutboxRepository extends CompositeRepository implements IOutboxRepository {
  constructor(opts?: StoreOpts) { super(opts); }

  async create(entry: Omit<IOutboxEntry, "id" | "createdAt" | "updatedAt">): Promise<IOutboxEntry> {
    return this.pg.run(async () => {
      const [row] = await this.pg.client
        .insert(TransactionOutboxTable)
        .values({ id: ID.outboxId(), ...entry, published: false })
        .returning();
      if (!row) throw new Error("Failed to create outbox entry");
      return {
        id: row.id,
        transactionId: row.transactionId as TTransactionId,
        eventType: row.eventType,
        payload: row.payload as Record<string, any>,
        published: row.published,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }, "FAILED_TO_CREATE_OUTBOX_ENTRY");
  }

  async markAsPublished(transactionId: TTransactionId, publishedAt: Date = new Date()): Promise<void> {
    await this.pg.run(async () => {
      await this.pg.client
        .update(TransactionOutboxTable)
        .set({ published: true, publishedAt })
        .where(eq(TransactionOutboxTable.transactionId, transactionId));
    }, "FAILED_TO_MARK_OUTBOX_PUBLISHED");
  }

  async findUnpublished(limit: number = 100): Promise<IOutboxEntry[]> {
    return this.pg.run(async () => {
      const rows = await this.pg.client
        .select()
        .from(TransactionOutboxTable)
        .where(eq(TransactionOutboxTable.published, false))
        .orderBy(desc(TransactionOutboxTable.createdAt))
        .limit(limit);
      return rows.map((row) => ({
        id: row.id,
        transactionId: row.transactionId as TTransactionId,
        eventType: row.eventType,
        payload: row.payload as Record<string, any>,
        published: row.published,
        publishedAt: row.publishedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    }, "FAILED_TO_FIND_UNPUBLISHED_OUTBOX");
  }
}
