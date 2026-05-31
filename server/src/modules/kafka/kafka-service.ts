import type { IKafkaService, ITransactionEvent } from "./kafka-service.interface";
import { Logger } from "@/lib/logger";

const logger = Logger("KafkaService");

export class KafkaService implements IKafkaService {
  private brokerUrl: string;
  private topic: string = "wallet.transactions";
  private producer: any;
  private isConnected: boolean = false;

  constructor(brokerUrl: string = process.env.KAFKA_BROKER_URL || "localhost:9092") {
    this.brokerUrl = brokerUrl;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      // Dynamic import to avoid bundling issues in dev
      const { Kafka } = await import("kafkajs");
      const kafka = new Kafka({
        clientId: "wallet-service",
        brokers: [this.brokerUrl],
      });

      this.producer = kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      logger.info(`Connected to Kafka broker at ${this.brokerUrl}`);
    } catch (error) {
      logger.error("Failed to connect to Kafka", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected && this.producer) {
      try {
        await this.producer.disconnect();
        this.isConnected = false;
        logger.info("Disconnected from Kafka");
      } catch (error) {
        logger.error("Failed to disconnect from Kafka", error);
        throw error;
      }
    }
  }

  async publishTransactionEvent(event: ITransactionEvent): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [
          {
            key: event.transactionId,
            value: JSON.stringify(event),
          },
        ],
      });

      logger.info(`Published transaction event for transaction ${event.transactionId}`);
    } catch (error) {
      logger.error(`Failed to publish transaction event`, error);
      throw error;
    }
  }
}
