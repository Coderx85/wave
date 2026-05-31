import { desc, eq } from "drizzle-orm";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { db } from "@/modules/database/client";
import { TransactionOutboxTable } from "@/modules/database/schema";
import { ID } from "@/lib/ID";
import type { TTransactionId } from "@/types";
import type { IOutboxEntry, IOutboxRepository } from "./outbox-repo.interface";

export class OutboxRepository implements IOutboxRepository {
  constructor() {}

  async create(
    entry: Omit<IOutboxEntry, "id" | "createdAt" | "updatedAt">
  ): Promise<IOutboxEntry> {
    return tryCatch({
      ctx: async () => {
        const id = ID.outboxId();

        const result = await db
          .insert(TransactionOutboxTable)
          .values({
            id,
            transactionId: entry.transactionId,
            eventType: entry.eventType,
            payload: entry.payload,
            published: false,
          })
          .returning();

        const created = result[0];
        if (!created) {
          throw new Error("Failed to create outbox entry");
        }

        return {
          id: created.id,
          transactionId: created.transactionId as TTransactionId,
          eventType: created.eventType,
          payload: created.payload as Record<string, any>,
          published: created.published,
          publishedAt: created.publishedAt,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
      },
    });
  }

  async markAsPublished(transactionId: TTransactionId, publishedAt: Date = new Date()): Promise<void> {
    return tryCatch({
      ctx: async () => {
        await db
          .update(TransactionOutboxTable)
          .set({
            published: true,
            publishedAt,
          })
          .where(eq(TransactionOutboxTable.transactionId, transactionId));
      },
    });
  }

  async findUnpublished(limit: number = 100): Promise<IOutboxEntry[]> {
    return tryCatch({
      ctx: async () => {
        const results = await db
          .select()
          .from(TransactionOutboxTable)
          .where(eq(TransactionOutboxTable.published, false))
          .orderBy(desc(TransactionOutboxTable.createdAt))
          .limit(limit);

        return results.map((row) => ({
          id: row.id,
          transactionId: row.transactionId as TTransactionId,
          eventType: row.eventType,
          payload: row.payload as Record<string, any>,
          published: row.published,
          publishedAt: row.publishedAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }));
      },
    });
  }
}
