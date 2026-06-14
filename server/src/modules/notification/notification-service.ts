import { NotificationConsumer } from "./consumer";
import { EmailSender } from "./email-sender";
import { NotificationRepository } from "./repository";
import { notificationStream } from "./stream";
import type {
  INotificationRepository,
} from "./repository";
import type { IEmailSender } from "./email-sender";
import type { INotificationConsumer } from "./consumer";
import type { INotificationStream } from "./stream";
import type { ITransactionEvent } from "@/modules/kafka";
import { Logger } from "@/lib/logger";
import { db } from "@/modules/database/client";
import { users } from "@/modules/database/schema";
import { eq } from "drizzle-orm";

const logger = Logger("NotificationService");

export class NotificationService {
  private consumer: INotificationConsumer;
  private emailSender: IEmailSender;
  private notificationRepository: INotificationRepository;
  private stream: INotificationStream;

  // userLookup: optional injection to resolve user email by id (for tests)
  constructor(
    consumer: INotificationConsumer = new NotificationConsumer(),
    emailSender: IEmailSender = new EmailSender(),
    notificationRepository: INotificationRepository = new NotificationRepository(),
    stream: INotificationStream = notificationStream,
    private readonly userLookup?: (userId: string) => Promise<{ email: string } | null>
  ) {
    this.consumer = consumer;
    this.emailSender = emailSender;
    this.notificationRepository = notificationRepository;
    this.stream = stream;
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
      // Resolve user email. Allow injecting a mock lookup for tests.
      let userEmail: string | null = null;
      if (this.userLookup) {
        const u = await this.userLookup(event.userId as string);
        userEmail = u?.email ?? null;
      } else {
        const userResults = await db
          .select()
          .from(users)
          .where(eq(users.id, event.userId as any));

        if (!userResults || userResults.length === 0) {
          logger.warn(`User ${event.userId} not found for transaction ${event.transactionId}`);
          return;
        }

        const user = userResults[0]!;
        userEmail = user.email as string;
      }

      if (!userEmail) {
        logger.warn(`User ${event.userId} has no email for transaction ${event.transactionId}`);
        return;
      }

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
      this.stream.publish({
        type: "notification.created",
        notification,
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
        const sentAt = new Date();
        this.stream.publish({
          type: "notification.updated",
          notification: {
            ...notification,
            status: "sent",
            sentAt,
            updatedAt: sentAt,
          },
        });

        logger.info(
          `Notification sent for transaction ${event.transactionId} to ${userEmail}`
        );
      } catch (emailError) {
        // Mark notification as failed
        await this.notificationRepository.updateStatus(
          notification.id,
          "failed"
        );
        const updatedAt = new Date();
        this.stream.publish({
          type: "notification.updated",
          notification: {
            ...notification,
            status: "failed",
            updatedAt,
          },
        });

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
