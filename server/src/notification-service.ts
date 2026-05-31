import { NotificationService } from "./modules/notification";
import { Logger } from "./lib/logger";

const logger = Logger("NotificationServiceMain");

const notificationService = new NotificationService();

// Graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully...");
  await notificationService.stop();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully...");
  await notificationService.stop();
  process.exit(0);
});

// Start service
notificationService
  .start()
  .then(() => {
    logger.info("Notification service is running");
  })
  .catch((error) => {
    logger.error("Failed to start notification service", error);
    process.exit(1);
  });
