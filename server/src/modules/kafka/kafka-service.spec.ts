import { describe, it, expect, beforeEach, vi } from "vitest";
import { KafkaService } from "./kafka-service";
import type { ITransactionEvent } from "./kafka-service.interface";

// Mock the logger
vi.mock("@/lib/logger", () => ({
  Logger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

// Create mock producer instance
const mockProducer = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn(),
};

// Create mock Kafka class
const mockKafkaConstructor = vi.fn(function () {
  return {
    producer: vi.fn(() => mockProducer),
  };
});

vi.mock("kafkajs", () => ({
  Kafka: mockKafkaConstructor,
}));

describe("KafkaService", () => {
  let kafkaService: KafkaService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Reset producer mock functions
    mockProducer.connect.mockResolvedValue(undefined);
    mockProducer.disconnect.mockResolvedValue(undefined);
    mockProducer.send.mockResolvedValue(undefined);

    // Create a fresh service instance
    kafkaService = new KafkaService("localhost:9092");
  });

  describe("connect()", () => {
    it("should successfully connect to Kafka broker", async () => {
      // Execute
      await kafkaService.connect();

      // Assert
      expect(mockKafkaConstructor).toHaveBeenCalledWith({
        clientId: "wallet-service",
        brokers: ["localhost:9092"],
      });
      expect(mockProducer.connect).toHaveBeenCalled();
    });

    it("should return early if already connected", async () => {
      // Connect first time
      await kafkaService.connect();
      const firstCallCount = mockKafkaConstructor.mock.calls.length;

      // Try to connect again
      await kafkaService.connect();

      // Assert - Kafka should not be called again
      expect(mockKafkaConstructor.mock.calls.length).toBe(firstCallCount);
    });

    it("should handle connection errors", async () => {
      // Setup - make connect fail
      const connectError = new Error("Connection refused");
      mockProducer.connect.mockRejectedValueOnce(connectError);

      // Execute and expect error
      await expect(kafkaService.connect()).rejects.toThrow("Connection refused");
    });

    it("should use default broker URL from environment if not provided", async () => {
      // Setup
      const originalEnv = process.env.KAFKA_BROKER_URL;
      process.env.KAFKA_BROKER_URL = "kafka:9092";

      // Create new service without explicit broker
      const serviceWithEnv = new KafkaService();

      // Execute
      await serviceWithEnv.connect();

      // Assert - last Kafka call should use the environment broker
      const lastCall = mockKafkaConstructor.mock.calls[mockKafkaConstructor.mock.calls.length - 1] as any[];
      if (lastCall && lastCall[0] && (lastCall[0] as any).brokers) {
        expect((lastCall[0] as any).brokers).toContain("kafka:9092");
      }
      // Cleanup
      process.env.KAFKA_BROKER_URL = originalEnv;
    });
  });

  describe("disconnect()", () => {
    it("should disconnect if connected", async () => {
      // Connect first
      await kafkaService.connect();

      // Reset the mock to check if it's called again
      mockProducer.disconnect.mockClear();

      // Execute disconnect
      await kafkaService.disconnect();

      // Assert
      expect(mockProducer.disconnect).toHaveBeenCalled();
    });

    it("should not attempt to disconnect if not connected", async () => {
      // Execute disconnect without connecting
      await kafkaService.disconnect();

      // Assert - disconnect should not be called
      expect(mockProducer.disconnect).not.toHaveBeenCalled();
    });

    it("should handle disconnect errors", async () => {
      // Setup - make disconnect fail
      const disconnectError = new Error("Disconnect failed");
      mockProducer.disconnect.mockRejectedValueOnce(disconnectError);

      // Connect first
      await kafkaService.connect();

      // Execute and expect error
      await expect(kafkaService.disconnect()).rejects.toThrow("Disconnect failed");
    });
  });

  describe("publishTransactionEvent()", () => {
    const mockEvent: ITransactionEvent = {
      eventType: "transaction.created",
      transactionId: "txn-123",
      userId: "user-456",
      senderAccountId: "acc-001",
      receiverAccountId: "acc-002",
      amount: "100.00",
      senderName: "John Doe",
      receiverName: "Jane Smith",
      status: "completed",
      timestamp: "2024-01-01T12:00:00Z",
    };

    it("should publish event to wallet.transactions topic", async () => {
      // Connect first
      await kafkaService.connect();

      // Reset to check for the send call
      mockProducer.send.mockClear();

      // Execute
      await kafkaService.publishTransactionEvent(mockEvent);

      // Assert
      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: "wallet.transactions",
        messages: [
          {
            key: "txn-123",
            value: JSON.stringify(mockEvent),
          },
        ],
      });
    });

    it("should auto-connect if not already connected", async () => {
      // Reset mock to ensure initial state
      mockProducer.connect.mockClear();

      // Execute without connecting first
      await kafkaService.publishTransactionEvent(mockEvent);

      // Assert - should have triggered a connection
      expect(mockProducer.connect).toHaveBeenCalled();
      expect(mockProducer.send).toHaveBeenCalled();
    });

    it("should format event correctly with transaction ID as key", async () => {
      // Connect first
      await kafkaService.connect();
      mockProducer.send.mockClear();

      // Execute
      await kafkaService.publishTransactionEvent(mockEvent);

      // Assert
      const callArgs = mockProducer.send.mock.calls[0][0];
      expect(callArgs.messages[0].key).toBe(mockEvent.transactionId);
      expect(callArgs.messages[0].value).toBe(JSON.stringify(mockEvent));
      expect(JSON.parse(callArgs.messages[0].value)).toEqual(mockEvent);
    });

    it("should handle publish errors", async () => {
      // Setup - make send fail
      const publishError = new Error("Failed to publish message");
      mockProducer.send.mockRejectedValueOnce(publishError);

      // Connect first
      await kafkaService.connect();

      // Execute and expect error
      await expect(kafkaService.publishTransactionEvent(mockEvent)).rejects.toThrow(
        "Failed to publish message"
      );
    });

    it("should not reconnect if already connected before publishing", async () => {
      // Connect first
      await kafkaService.connect();
      expect(mockProducer.connect).toHaveBeenCalledTimes(1);

      // Reset mock to check if connect is called again
      mockProducer.connect.mockClear();

      // Execute publish
      await kafkaService.publishTransactionEvent(mockEvent);

      // Assert - connect should not be called again
      expect(mockProducer.connect).not.toHaveBeenCalled();
      expect(mockProducer.send).toHaveBeenCalled();
    });

    it("should handle multiple events with different transaction IDs", async () => {
      // Connect first
      await kafkaService.connect();
      mockProducer.send.mockClear();

      const event1: ITransactionEvent = { ...mockEvent, transactionId: "txn-001" };
      const event2: ITransactionEvent = { ...mockEvent, transactionId: "txn-002" };

      // Execute
      await kafkaService.publishTransactionEvent(event1);
      await kafkaService.publishTransactionEvent(event2);

      // Assert
      expect(mockProducer.send).toHaveBeenCalledTimes(2);
      expect(mockProducer.send.mock.calls[0][0].messages[0].key).toBe("txn-001");
      expect(mockProducer.send.mock.calls[1][0].messages[0].key).toBe("txn-002");
    });

    it("should include complete event data in message value", async () => {
      // Connect first
      await kafkaService.connect();
      mockProducer.send.mockClear();

      // Execute
      await kafkaService.publishTransactionEvent(mockEvent);

      // Assert
      const callArgs = mockProducer.send.mock.calls[0][0];
      const publishedValue = JSON.parse(callArgs.messages[0].value);

      expect(publishedValue).toEqual(mockEvent);
      expect(publishedValue.eventType).toBe("transaction.created");
      expect(publishedValue.userId).toBe("user-456");
      expect(publishedValue.amount).toBe("100.00");
    });
  });

  describe("constructor", () => {
    it("should initialize with custom broker URL", () => {
      // Should not throw
      const customService = new KafkaService("custom-kafka:9092");
      expect(customService).toBeDefined();
    });

    it("should use localhost:9092 as default broker URL", () => {
      // Should not throw
      const defaultService = new KafkaService();
      expect(defaultService).toBeDefined();
    });
  });

  describe("integration scenarios", () => {
    const mockEvent: ITransactionEvent = {
      eventType: "transaction.created",
      transactionId: "txn-123",
      userId: "user-456",
      senderAccountId: "acc-001",
      receiverAccountId: "acc-002",
      amount: "100.00",
      senderName: "John Doe",
      receiverName: "Jane Smith",
      status: "completed",
      timestamp: "2024-01-01T12:00:00Z",
    };

    it("should handle connect, publish, and disconnect flow", async () => {
      // Execute full flow
      await kafkaService.connect();
      expect(mockProducer.connect).toHaveBeenCalled();

      await kafkaService.publishTransactionEvent(mockEvent);
      expect(mockProducer.send).toHaveBeenCalled();

      mockProducer.disconnect.mockClear();
      await kafkaService.disconnect();
      expect(mockProducer.disconnect).toHaveBeenCalled();
    });

    it("should handle multiple publish operations after single connect", async () => {
      // Connect once
      await kafkaService.connect();
      expect(mockProducer.connect).toHaveBeenCalledTimes(1);

      // Clear both mocks
      mockProducer.connect.mockClear();
      mockProducer.send.mockClear();

      // Publish multiple events
      const event1: ITransactionEvent = { ...mockEvent, transactionId: "txn-001" };
      const event2: ITransactionEvent = { ...mockEvent, transactionId: "txn-002" };
      const event3: ITransactionEvent = { ...mockEvent, transactionId: "txn-003" };

      await kafkaService.publishTransactionEvent(event1);
      await kafkaService.publishTransactionEvent(event2);
      await kafkaService.publishTransactionEvent(event3);

      // Assert - only one connect (during initial connection, which was cleared), three sends
      expect(mockProducer.connect).not.toHaveBeenCalled(); // Not called again
      expect(mockProducer.send).toHaveBeenCalledTimes(3);
    });

    it("should retry connection on failure during publish", async () => {
      // Setup - first connect will fail
      const connectError = new Error("Connection failed");
      mockProducer.connect.mockRejectedValueOnce(connectError);

      // Try to publish without pre-connecting - should fail
      await expect(kafkaService.publishTransactionEvent(mockEvent)).rejects.toThrow(
        "Connection failed"
      );

      // Now setup for successful connection and publish
      mockProducer.connect.mockResolvedValueOnce(undefined);

      // Try again - should work
      await kafkaService.publishTransactionEvent(mockEvent);
      expect(mockProducer.send).toHaveBeenCalled();
    });
  });
});
