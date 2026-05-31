import { EventEmitter } from "node:events";
import type {
  INotificationStream,
  INotificationStreamEvent,
} from "./notification-stream.interface";

const DEFAULT_MAX_LISTENERS = 0;

export class NotificationStream implements INotificationStream {
  private emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(DEFAULT_MAX_LISTENERS);
  }

  publish(event: INotificationStreamEvent): void {
    this.emitter.emit(event.notification.userId, event);
  }

  subscribe(
    userId: string,
    listener: (event: INotificationStreamEvent) => void
  ): () => void {
    this.emitter.on(userId, listener);

    return () => {
      this.emitter.off(userId, listener);
    };
  }
}

export const notificationStream = new NotificationStream();
