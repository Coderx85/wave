export interface INotification {
  id: string;
  transactionId: string;
  userId: string;
  email: string;
  subject: string;
  message: string;
  status: "pending" | "sent" | "failed";
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationRepository {
  create(notification: Omit<INotification, "id" | "createdAt" | "updatedAt">): Promise<INotification>;
  updateStatus(id: string, status: "pending" | "sent" | "failed", sentAt?: Date): Promise<void>;
  findPending(limit?: number): Promise<INotification[]>;
  findByTransactionId(transactionId: string): Promise<INotification | null>;
  findByUserId(userId: string, limit?: number): Promise<INotification[]>;
}
