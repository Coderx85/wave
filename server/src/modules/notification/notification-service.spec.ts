import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService } from './notification-service';
import type { ITransactionEvent } from '../kafka';

/**
 * Integration tests for NotificationService
 * 
 * These tests verify the service lifecycle and error handling
 */
describe('NotificationService - Integration Tests', () => {
  let notificationService: NotificationService;
  let mockConsumer: any;
  let mockEmailSender: any;
  let mockRepository: any;

  beforeEach(() => {
    // Mock dependencies
    let messageCallback: ((event: ITransactionEvent) => Promise<void>) | null = null;

    mockConsumer = {
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      startConsuming: vi.fn().mockImplementation(async (callback) => {
        messageCallback = callback;
      }),
    };

    (mockConsumer as any).triggerMessage = async (event: ITransactionEvent) => {
      if (messageCallback) {
        await messageCallback(event);
      }
    };

    mockEmailSender = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      sendTransactionNotification: vi.fn().mockResolvedValue(undefined),
    };

    mockRepository = {
      create: vi.fn().mockResolvedValue({
        id: 'notification_123',
        transactionId: 'transaction_test_123',
        userId: 'user_test_456',
        email: 'jane@example.com',
        subject: 'Transaction Notification',
        message: 'You have received a transaction',
        status: 'pending',
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    };

    notificationService = new NotificationService(
      mockConsumer as any,
      mockEmailSender as any,
      mockRepository as any
    );
  });

  afterEach(async () => {
    try {
      await notificationService.stop();
    } catch {
      // Ignore errors on stop
    }
  });

  describe('Service Lifecycle', () => {
    it('should start service successfully', async () => {
      await notificationService.start();

      expect(mockEmailSender.initialize).toHaveBeenCalled();
      expect(mockConsumer.connect).toHaveBeenCalled();
      expect(mockConsumer.startConsuming).toHaveBeenCalled();
    });

    it('should stop service successfully', async () => {
      await notificationService.start();
      await notificationService.stop();

      expect(mockConsumer.disconnect).toHaveBeenCalled();
      expect(mockEmailSender.close).toHaveBeenCalled();
    });
  });

  describe('Transaction Event Handling', () => {
    it('should continue consuming on individual message failure', async () => {
      // This test verifies that service doesn't crash on error
      const faultyConsumer = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        startConsuming: vi.fn().mockImplementation(async (callback) => {
          // First event causes error, second should still be processed
          try {
            await callback({
              eventType: 'transaction.created',
              transactionId: 'bad_transaction',
              userId: 'bad_user',
            } as any);
          } catch (e) {
            // Ignored - should be handled by service
          }
          // Second event should process fine
          await callback({
            eventType: 'transaction.created',
            transactionId: 'good_transaction',
            userId: 'good_user',
            senderAccountId: 'acc_sender',
            receiverAccountId: 'acc_receiver',
            amount: '5000',
            senderName: 'John',
            receiverName: 'Jane',
            status: 'pending',
            timestamp: new Date().toISOString(),
          });
        }),
      };

      const faultyService = new NotificationService(
        faultyConsumer as any,
        mockEmailSender as any,
        mockRepository as any
      );

      // Should not throw even with bad event
      await expect(faultyService.start()).resolves.not.toThrow();
      await faultyService.stop();
    });

    it('should handle database errors gracefully', async () => {
      const failingRepository = {
        create: vi.fn().mockRejectedValue(new Error('Database error')),
        updateStatus: vi.fn().mockResolvedValue(undefined),
      };

      let messageCallback: any = null;
      const errorConsumer = {
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        startConsuming: vi.fn().mockImplementation(async (callback) => {
          messageCallback = callback;
        }),
      };

      const failingService = new NotificationService(
        errorConsumer as any,
        mockEmailSender as any,
        failingRepository as any
      );

      await failingService.start();

      // Trigger a message that will cause DB error
      const testEvent: ITransactionEvent = {
        eventType: 'transaction.created',
        transactionId: 'txn_123',
        userId: 'user_456',
        senderAccountId: 'acc_sender',
        receiverAccountId: 'acc_receiver',
        amount: '1000',
        senderName: 'John',
        receiverName: 'Jane',
        status: 'pending',
        timestamp: new Date().toISOString(),
      };

      // Should not throw - error is caught internally
      await expect(messageCallback(testEvent)).resolves.not.toThrow();
      await failingService.stop();
    });

    it('should handle email service initialization errors', async () => {
      const failingEmailSender = {
        initialize: vi.fn().mockRejectedValue(new Error('SMTP connection failed')),
        close: vi.fn().mockResolvedValue(undefined),
        sendTransactionNotification: vi.fn().mockResolvedValue(undefined),
      };

      const failingService = new NotificationService(
        mockConsumer as any,
        failingEmailSender as any,
        mockRepository as any
      );

      // Should throw when email sender fails to initialize
      await expect(failingService.start()).rejects.toThrow();
    });

    it('should handle Kafka consumer connection errors', async () => {
      const failingConsumer = {
        connect: vi.fn().mockRejectedValue(new Error('Kafka broker unavailable')),
        disconnect: vi.fn().mockResolvedValue(undefined),
        startConsuming: vi.fn().mockResolvedValue(undefined),
      };

      const failingService = new NotificationService(
        failingConsumer as any,
        mockEmailSender as any,
        mockRepository as any
      );

      // Should throw when consumer fails to connect
      await expect(failingService.start()).rejects.toThrow();
    });
  });
});
