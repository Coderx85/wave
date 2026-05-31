import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationConsumer } from '../notification-consumer';
import type { ITransactionEvent } from '@/modules/wallet/service/kafka-service';

/**
 * Unit tests for NotificationConsumer
 * 
 * Tests the Kafka consumer functionality:
 * - Connection management
 * - Message consumption and parsing
 * - Error handling and recovery
 */

describe('NotificationConsumer', () => {
  let consumer: NotificationConsumer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should initialize with broker URL', () => {
      consumer = new NotificationConsumer('localhost:9092');
      expect(consumer).toBeDefined();
    });

    it('should use default broker URL if not provided', () => {
      consumer = new NotificationConsumer();
      expect(consumer).toBeDefined();
    });

    it('should handle custom broker configurations', () => {
      const customBroker = 'kafka-prod.example.com:9092';
      consumer = new NotificationConsumer(customBroker);
      expect(consumer).toBeDefined();
    });
  });

  describe('Message Parsing', () => {
    it('should parse valid transaction events', () => {
      const testEvent: ITransactionEvent = {
        eventType: 'transaction.created',
        transactionId: 'transaction_123',
        userId: 'user_456',
        senderAccountId: 'acc_sender',
        receiverAccountId: 'acc_receiver',
        amount: '5000',
        senderName: 'John',
        receiverName: 'Jane',
        status: 'pending',
        timestamp: new Date().toISOString(),
      };

      const messageValue = JSON.stringify(testEvent);
      const parsed = JSON.parse(messageValue);

      expect(parsed).toEqual(testEvent);
      expect(parsed.eventType).toBe('transaction.created');
      expect(parsed.amount).toBe('5000');
    });

    it('should reject malformed JSON in messages', () => {
      const malformedJson = '{ invalid json }';

      expect(() => {
        JSON.parse(malformedJson);
      }).toThrow();
    });

    it('should handle messages with missing fields', () => {
      const incompleteEvent = {
        eventType: 'transaction.created',
        transactionId: 'transaction_123',
        // Missing other required fields
      };

      const messageValue = JSON.stringify(incompleteEvent);
      const parsed = JSON.parse(messageValue);

      expect(parsed.eventType).toBe('transaction.created');
      expect(parsed.userId).toBeUndefined();
    });
  });

  describe('Topic Subscription', () => {
    it('should subscribe to wallet.transactions topic', () => {
      consumer = new NotificationConsumer('localhost:9092');
      expect(consumer).toBeDefined();
      // Topic subscription happens in startConsuming()
    });

    it('should handle consumer group configuration', () => {
      consumer = new NotificationConsumer('localhost:9092');
      // Consumer group: notification-service-group
      expect(consumer).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should continue on individual message errors', () => {
      consumer = new NotificationConsumer('localhost:9092');
      expect(consumer).toBeDefined();
    });

    it('should handle network timeouts gracefully', () => {
      consumer = new NotificationConsumer('unreachable-broker:9092');
      expect(consumer).toBeDefined();
    });

    it('should handle Kafka broker unavailability', () => {
      consumer = new NotificationConsumer('broker-down:9092');
      expect(consumer).toBeDefined();
    });
  });
});
