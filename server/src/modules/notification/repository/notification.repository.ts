import { desc, eq } from "drizzle-orm";
import { CompositeRepository, type IPostgresStore, type ICacheStore } from "@/lib/repository";
import { NotificationsTable } from "@/modules/database/schema";
import { ID } from "@/lib/ID";
import type { INotification, INotificationRepository } from "./contracts";

type StoreOpts = { pg?: IPostgresStore; cache?: ICacheStore };

export class NotificationRepository extends CompositeRepository implements INotificationRepository {
  constructor(opts?: StoreOpts) { super(opts); }

  async create(notification: Omit<INotification, "id" | "createdAt" | "updatedAt">): Promise<INotification> {
    return this.pg.run(async () => {
      const [row] = await this.pg.client
        .insert(NotificationsTable)
        .values({ id: ID.outboxId(), ...notification })
        .returning();
      if (!row) throw new Error("Failed to create notification");
      return {
        id: row.id,
        transactionId: row.transactionId,
        userId: row.userId,
        email: row.email,
        subject: row.subject,
        message: row.message,
        status: row.status as INotification["status"],
        read: row.read,
        sentAt: row.sentAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }, "FAILED_TO_CREATE_NOTIFICATION");
  }

  async updateStatus(id: string, status: INotification["status"], sentAt?: Date): Promise<void> {
    await this.pg.run(async () => {
      await this.pg.client
        .update(NotificationsTable)
        .set({ status, sentAt: sentAt ?? (status === "sent" ? new Date() : undefined) })
        .where(eq(NotificationsTable.id, id));
    }, "FAILED_TO_UPDATE_NOTIFICATION_STATUS");
  }

  async markAsRead(id: string): Promise<void> {
    await this.pg.run(async () => {
      await this.pg.client
        .update(NotificationsTable)
        .set({ read: true })
        .where(eq(NotificationsTable.id, id));
    }, "FAILED_TO_MARK_NOTIFICATION_READ");
  }

  async delete(id: string): Promise<void> {
    await this.pg.run(async () => {
      await this.pg.client
        .delete(NotificationsTable)
        .where(eq(NotificationsTable.id, id));
    }, "FAILED_TO_DELETE_NOTIFICATION");
  }

  async findPending(limit: number = 100): Promise<INotification[]> {
    return this.pg.run(async () => {
      const rows = await this.pg.client
        .select()
        .from(NotificationsTable)
        .where(eq(NotificationsTable.status, "pending"))
        .limit(limit);
      return rows.map((row) => ({
        id: row.id,
        transactionId: row.transactionId,
        userId: row.userId,
        email: row.email,
        subject: row.subject,
        message: row.message,
        status: row.status as INotification["status"],
        read: row.read,
        sentAt: row.sentAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    }, "FAILED_TO_FIND_PENDING_NOTIFICATIONS");
  }

  async findByTransactionId(transactionId: string): Promise<INotification | null> {
    return this.pg.run(async () => {
      const [row] = await this.pg.client
        .select()
        .from(NotificationsTable)
        .where(eq(NotificationsTable.transactionId, transactionId))
        .limit(1);
      if (!row) return null;
      return {
        id: row.id,
        transactionId: row.transactionId,
        userId: row.userId,
        email: row.email,
        subject: row.subject,
        message: row.message,
        status: row.status as INotification["status"],
        read: row.read,
        sentAt: row.sentAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }, "FAILED_TO_FIND_NOTIFICATION_BY_TX");
  }

  async findByUserId(userId: string, limit: number = 50): Promise<INotification[]> {
    return this.pg.run(async () => {
      const rows = await this.pg.client
        .select()
        .from(NotificationsTable)
        .where(eq(NotificationsTable.userId, userId))
        .orderBy(desc(NotificationsTable.createdAt))
        .limit(limit);
      return rows.map((row) => ({
        id: row.id,
        transactionId: row.transactionId,
        userId: row.userId,
        email: row.email,
        subject: row.subject,
        message: row.message,
        status: row.status as INotification["status"],
        read: row.read,
        sentAt: row.sentAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }));
    }, "FAILED_TO_FIND_NOTIFICATIONS_BY_USER");
  }
}
