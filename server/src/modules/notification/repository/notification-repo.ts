import { eq, and } from "drizzle-orm";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { db } from "@/modules/database/client";
import { NotificationsTable } from "@/modules/database/schema";
import { ID } from "@/lib/ID";
import type { INotification, INotificationRepository } from "./notification-repo.interface";

export class NotificationRepository implements INotificationRepository {
  constructor() {}

  async create(
    notification: Omit<INotification, "id" | "createdAt" | "updatedAt">
  ): Promise<INotification> {
    return tryCatch({
      ctx: async () => {
        const id = ID.outboxId(); // Reuse ID generator for now

        const result = await db
          .insert(NotificationsTable)
          .values({
            id,
            transactionId: notification.transactionId,
            userId: notification.userId,
            email: notification.email,
            subject: notification.subject,
            message: notification.message,
            status: notification.status || "pending",
          })
          .returning();

        const created = result[0];
        if (!created) {
          throw new Error("Failed to create notification");
        }

        return {
          id: created.id,
          transactionId: created.transactionId,
          userId: created.userId,
          email: created.email,
          subject: created.subject,
          message: created.message,
          status: created.status as "pending" | "sent" | "failed",
          sentAt: created.sentAt,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
      },
    });
  }

  async updateStatus(
    id: string,
    status: "pending" | "sent" | "failed",
    sentAt?: Date
  ): Promise<void> {
    return tryCatch({
      ctx: async () => {
        await db
          .update(NotificationsTable)
          .set({
            status,
            sentAt: sentAt || (status === "sent" ? new Date() : undefined),
          })
          .where(eq(NotificationsTable.id, id));
      },
    });
  }

  async findPending(limit: number = 100): Promise<INotification[]> {
    return tryCatch({
      ctx: async () => {
        const results = await db
          .select()
          .from(NotificationsTable)
          .where(eq(NotificationsTable.status, "pending"))
          .limit(limit);

        return results.map((row) => ({
          id: row.id,
          transactionId: row.transactionId,
          userId: row.userId,
          email: row.email,
          subject: row.subject,
          message: row.message,
          status: row.status as "pending" | "sent" | "failed",
          sentAt: row.sentAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }));
      },
    });
  }

  async findByTransactionId(transactionId: string): Promise<INotification | null> {
    return tryCatch({
      ctx: async () => {
        const result = await db
          .select()
          .from(NotificationsTable)
          .where(eq(NotificationsTable.transactionId, transactionId))
          .limit(1);

        if (!result.length) {
          return null;
        }

        const row = result[0];
        if (!row) {
          return null;
        }

        return {
          id: row.id,
          transactionId: row.transactionId,
          userId: row.userId,
          email: row.email,
          subject: row.subject,
          message: row.message,
          status: row.status as "pending" | "sent" | "failed",
          sentAt: row.sentAt,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      },
    });
  }
}
