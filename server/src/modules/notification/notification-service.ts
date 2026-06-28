import { NotificationConsumer } from "./consumer";
import { EmailSender } from "./email-sender";
import { NotificationRepository, NotificationPreferenceRepository } from "./repository";
import { notificationStream } from "./stream";
import type {
  INotificationRepository, INotificationPreferenceRepository, NotificationEventType,
} from "./repository";
import type { IEmailSender } from "./email-sender";
import type { INotificationConsumer } from "./consumer";
import type { INotificationStream } from "./stream";
import type { IKafkaService, ITransactionEvent } from "@/modules/kafka";
import { KafkaService } from "@/modules/kafka";
import { Logger } from "@/lib/logger";
import { db } from "@/modules/database/client";
import { users } from "@/modules/database/schema";
import { eq } from "drizzle-orm";

const logger = Logger("NotificationService");

const MAX_RETRIES = 3;
const RETRY_INTERVAL_MS = 60_000;

export class NotificationService {
  private consumer: INotificationConsumer;
  private emailSender: IEmailSender;
  private notificationRepository: INotificationRepository;
  private stream: INotificationStream;
  private preferenceRepository: INotificationPreferenceRepository;
  private kafkaService: IKafkaService;
  private replayTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    consumer: INotificationConsumer = new NotificationConsumer(),
    emailSender: IEmailSender = new EmailSender(),
    notificationRepository: INotificationRepository = new NotificationRepository(),
    stream: INotificationStream = notificationStream,
    private readonly userLookup?: (userId: string) => Promise<{ email: string } | null>,
    preferenceRepository?: INotificationPreferenceRepository,
    kafkaService?: IKafkaService,
  ) {
    this.consumer = consumer;
    this.emailSender = emailSender;
    this.notificationRepository = notificationRepository;
    this.stream = stream;
    this.preferenceRepository = preferenceRepository ?? new NotificationPreferenceRepository();
    this.kafkaService = kafkaService ?? new KafkaService();
  }

  async start(): Promise<void> {
    try {
      logger.info("Starting notification service...");

      await this.emailSender.initialize();
      await this.consumer.connect();

      await this.consumer.startConsuming(async (event) => {
        await this.handleTransactionEvent(event);
      });

      this.startReplayLoop();

      logger.info("Notification service started successfully");
    } catch (error) {
      logger.error("Failed to start notification service", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.stopReplayLoop();
      await this.consumer.disconnect();
      await this.emailSender.close();
      logger.info("Notification service stopped");
    } catch (error) {
      logger.error("Error stopping notification service", error);
      throw error;
    }
  }

  private startReplayLoop(): void {
    if (this.replayTimer) return;
    logger.info(`Starting notification retry replay loop (every ${RETRY_INTERVAL_MS}ms)`);
    this.replayTimer = setInterval(() => {
      this.replayFailedNotifications().catch((err) => {
        logger.error("Error in notification replay loop", err);
      });
    }, RETRY_INTERVAL_MS);
  }

  private stopReplayLoop(): void {
    if (this.replayTimer) {
      clearInterval(this.replayTimer);
      this.replayTimer = null;
    }
  }

  private async replayFailedNotifications(): Promise<void> {
    const failed = await this.notificationRepository.findFailedForRetry(MAX_RETRIES);
    if (failed.length === 0) return;

    logger.info(`Replaying ${failed.length} failed notifications`);

    for (const notification of failed) {
      try {
        await this.attemptSend(
          notification.id,
          notification.email,
          notification.transactionId,
          "",
        );
        logger.info(`Retry succeeded for notification ${notification.id}`);
      } catch {
        logger.warn(`Retry failed for notification ${notification.id}, will retry later`);
      }
    }
  }

  private async handleTransactionEvent(event: ITransactionEvent): Promise<void> {
    try {
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

      const eventType: NotificationEventType = "transfer_incoming";

      const isEnabled = await this.preferenceRepository.isEventEnabled(event.userId, eventType);
      if (!isEnabled) {
        logger.info(`User ${event.userId} has disabled ${eventType} notifications, skipping`);
        return;
      }

      const notification = await this.notificationRepository.create({
        transactionId: event.transactionId,
        userId: event.userId,
        email: userEmail,
        subject: `Transaction Notification - ${event.transactionId}`,
        message: `You have received a transaction from ${event.senderName} for ${event.amount}`,
        status: "pending",
        read: false,
        sentAt: null,
        retryCount: 0,
        lastRetryAt: null,
        errorMessage: null,
      });

      this.stream.publish({
        type: "notification.created",
        notification,
      });

      await this.attemptSend(
        notification.id,
        userEmail,
        event.transactionId,
        event.senderName,
      );
    } catch (error) {
      logger.error(
        `Error handling transaction event ${event.transactionId}`,
        error,
      );
    }
  }

  private async attemptSend(
    notificationId: string,
    userEmail: string,
    transactionId: string,
    _senderName: string,
  ): Promise<void> {
    try {
      await this.emailSender.sendTransactionNotification(
        userEmail,
        _senderName,
        "",
        "",
        transactionId,
      );

      await this.notificationRepository.updateStatus(notificationId, "sent", new Date());
      const sentAt = new Date();
      this.stream.publish({
        type: "notification.updated",
        notification: {
          id: notificationId,
          status: "sent",
          sentAt,
          updatedAt: sentAt,
        } as any,
      });

      logger.info(`Notification sent for transaction ${transactionId} to ${userEmail}`);
    } catch (emailError) {
      const now = new Date();
      const errMsg = emailError instanceof Error ? emailError.message : String(emailError);

      const notification = await this.notificationRepository.findByTransactionId(transactionId);
      const currentRetryCount = notification ? notification.retryCount : 0;
      const newRetryCount = currentRetryCount + 1;

      await this.notificationRepository.updateStatus(notificationId, "failed");
      await this.notificationRepository.updateRetryState(notificationId, newRetryCount, now, errMsg);

      if (newRetryCount >= MAX_RETRIES) {
        await this.notificationRepository.updateStatus(notificationId, "dead_letter");

        logger.error(
          `Notification ${notificationId} moved to dead letter after ${MAX_RETRIES} failed attempts`,
        );
      } else {
        logger.error(
          `Failed to send notification (attempt ${newRetryCount}/${MAX_RETRIES}) for transaction ${transactionId}`,
          emailError,
        );
      }

      this.stream.publish({
        type: "notification.updated",
        notification: {
          id: notificationId,
          status: newRetryCount >= MAX_RETRIES ? "dead_letter" : "failed",
          updatedAt: now,
        } as any,
      });
    }
  }
}
