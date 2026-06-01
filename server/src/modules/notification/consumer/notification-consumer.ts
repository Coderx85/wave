import type { INotificationConsumer } from "./notification-consumer.interface";
import type { ITransactionEvent } from "@/modules/kafka";
import { Logger } from "@/lib/logger";

const logger = Logger("NotificationConsumer");

export class NotificationConsumer implements INotificationConsumer {
  private brokerUrl: string;
  private topic: string = "wallet.transactions";
  private consumer: any;
  private isConnected: boolean = false;

  constructor(brokerUrl: string = process.env.KAFKA_BROKER_URL || "localhost:9092") {
    this.brokerUrl = brokerUrl;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const { Kafka } = await import("kafkajs");
      const kafka = new Kafka({
        clientId: "notification-service",
        brokers: [this.brokerUrl],
      });

      this.consumer = kafka.consumer({
        groupId: "notification-service-group",
      });

      await this.consumer.connect();
      this.isConnected = true;
      logger.info(`Connected to Kafka broker at ${this.brokerUrl}`);
    } catch (error) {
      logger.error("Failed to connect to Kafka", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.consumer) {
      try {
        await this.consumer.disconnect();
        this.isConnected = false;
        logger.info("Disconnected from Kafka");
      } catch (error) {
        logger.error("Failed to disconnect from Kafka", error);
        throw error;
      }
    }
  }

  async startConsuming(
    callback: (message: ITransactionEvent) => Promise<void>
  ): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.consumer.subscribe({ topic: this.topic });

      await this.consumer.run({
        eachMessage: async (data: { topic: string; partition: number; message: any }) => {
          try {
            if (data.message.value) {
              const event = JSON.parse(data.message.value.toString()) as ITransactionEvent;
              logger.info(`Received message for transaction ${event.transactionId}`);
              await callback(event);
            }
          } catch (error) {
            logger.error(
              `Error processing message from partition ${data.partition}`,
              error
            );
            // Continue consuming even on error
          }
        },
      });
    } catch (error) {
      logger.error(`Failed to start consuming from topic ${this.topic}`, error);
      throw error;
    }
  }
}
