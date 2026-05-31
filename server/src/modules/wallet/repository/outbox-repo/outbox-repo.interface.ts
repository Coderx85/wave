import type { TTransactionId } from "@/types";

export interface IOutboxEntry {
  id: string;
  transactionId: TTransactionId;
  eventType: string;
  payload: Record<string, any>;
  published: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IOutboxRepository {
  create(entry: Omit<IOutboxEntry, "id" | "createdAt" | "updatedAt">): Promise<IOutboxEntry>;
  markAsPublished(transactionId: TTransactionId, publishedAt?: Date): Promise<void>;
  findUnpublished(limit?: number): Promise<IOutboxEntry[]>;
}
