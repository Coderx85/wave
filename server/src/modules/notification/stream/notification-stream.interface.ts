import type { INotification } from "../repository";

export interface INotificationStreamEvent {
  type: "notification.created" | "notification.updated";
  notification: INotification;
}

export interface INotificationStream {
  publish(event: INotificationStreamEvent): void;
  subscribe(userId: string, listener: (event: INotificationStreamEvent) => void): () => void;
}
