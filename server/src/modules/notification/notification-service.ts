import { NotificationConsumer } from "./consumer";
import { EmailSender } from "./email-sender";
import { NotificationRepository } from "./repository";
import type { ITransactionEvent } from "@/modules/wallet/service/kafka-service";
import { Logger } from "@/lib/logger";
import { db } from "@/modules/database/client";
import { users } from "@/modules/database/schema";
import { eq } from "drizzle-orm";

const logger = Logger("NotificationService");

export class NotificationService {
  private consumer: NotificationConsumer;
  private emailSender: EmailSender;
  private notificationRepository: NotificationRepository;

  constructor(
    consumer?: NotificationConsumer,
    emailSender?: EmailSender,
    notificationRepository?: NotificationRepository
  ) {
    this.consumer = consumer || new NotificationConsumer();
    this.emailSender = emailSender || new EmailSender();
    this.notificationRepository =
      notificationRepository || new NotificationRepository();
  }

  async start(): Promise<void> {
    try {
      logger.info("Starting notification service...");

      // Initialize email sender
      await this.emailSender.initialize();

      // Connect to Kafka
      await this.consumer.connect();

      // Start consuming messages
      await this.consumer.startConsuming(async (event) => {
        await this.handleTransactionEvent(event);
      });

      logger.info("Notification service started successfully");
    } catch (error) {
      logger.error("Failed to start notification service", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.consumer.disconnect();
      await this.emailSender.close();
      logger.info("Notification service stopped");
    } catch (error) {
      logger.error("Error stopping notification service", error);
      throw error;
    }
  }

  private async handleTransactionEvent(event: ITransactionEvent): Promise<void> {
    try {
      // Get user from database to find email
      const userResults = await db
        .select()
        .from(users)
        .where(eq(users.id, event.userId as any));

      if (!userResults || userResults.length === 0) {
        logger.warn(`User ${event.userId} not found for transaction ${event.transactionId}`);
        return;
      }

      const user = userResults[0]!;
      const userEmail = user.email as string;

      // Create notification in database
      const notification = await this.notificationRepository.create({
        transactionId: event.transactionId,
        userId: event.userId,
        email: userEmail,
        subject: `Transaction Notification - ${event.transactionId}`,
        message: `You have received a transaction from ${event.senderName} for ${event.amount}`,
        status: "pending",
        sentAt: null,
      });

      // Send email
      try {
        await this.emailSender.sendTransactionNotification(
          userEmail,
          event.senderName,
          event.receiverName,
          event.amount,
          event.transactionId
        );

        // Mark notification as sent
        await this.notificationRepository.updateStatus(
          notification.id,
          "sent",
          new Date()
        );

        logger.info(
          `Notification sent for transaction ${event.transactionId} to ${userEmail}`
        );
      } catch (emailError) {
        // Mark notification as failed
        await this.notificationRepository.updateStatus(
          notification.id,
          "failed"
        );

        logger.error(
          `Failed to send notification email for transaction ${event.transactionId}`,
          emailError
        );
      }
    } catch (error) {
      logger.error(
        `Error handling transaction event ${event.transactionId}`,
        error
      );
      // Don't throw - let consumer continue processing
    }
  }
}
