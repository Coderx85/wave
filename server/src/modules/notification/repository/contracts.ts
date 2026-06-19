export interface INotification {
  id: string;
  transactionId: string;
  userId: string;
  email: string;
  subject: string;
  message: string;
  status: "pending" | "sent" | "failed";
  read: boolean;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationRepository {
  create(notification: Omit<INotification, "id" | "createdAt" | "updatedAt">): Promise<INotification>;
  updateStatus(id: string, status: "pending" | "sent" | "failed", sentAt?: Date): Promise<void>;
  markAsRead(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  findPending(limit?: number): Promise<INotification[]>;
  findByTransactionId(transactionId: string): Promise<INotification | null>;
  findByUserId(userId: string, limit?: number): Promise<INotification[]>;
}

export type NotificationEventType = "deposit" | "transfer_incoming" | "transfer_outgoing";

export interface INotificationPreference {
  userId: string;
  eventType: NotificationEventType;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotificationPreferenceRepository {
  findByUserId(userId: string): Promise<INotificationPreference[]>;
  upsert(userId: string, eventType: NotificationEventType, enabled: boolean): Promise<INotificationPreference>;
  isEventEnabled(userId: string, eventType: NotificationEventType): Promise<boolean>;
}
