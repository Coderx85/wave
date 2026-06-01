import type { ITransactionEvent } from "@/modules/kafka";

export interface INotificationConsumer {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startConsuming(callback: (message: ITransactionEvent) => Promise<void>): Promise<void>;
}
