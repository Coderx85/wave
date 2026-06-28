import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { IOutboxEntry, IOutboxRepository } from "../repository";
import type { IKafkaService } from "@/modules/kafka";

const makeEntry = (overrides: Partial<IOutboxEntry> = {}): IOutboxEntry => ({
  id: "ob_1",
  transactionId: "tx_1",
  eventType: "transaction.created",
  payload: {
    eventType: "transaction.created",
    transactionId: "tx_1",
    userId: "user_1",
    senderAccountNumber: "1111111111",
    receiverAccountNumber: "2222222222",
    amount: "100000",
    senderName: "Alice",
    receiverName: "Bob",
    status: "pending",
    timestamp: new Date().toISOString(),
  },
  published: false,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

import { OutboxReplayService } from "./outbox-replay.service";

describe("OutboxReplayService", () => {
  let service: OutboxReplayService;
  let mockOutboxRepo: IOutboxRepository;
  let mockKafka: IKafkaService;

  beforeEach(() => {
    mockOutboxRepo = {
      create: vi.fn(),
      markAsPublished: vi.fn().mockResolvedValue(undefined),
      findUnpublished: vi.fn().mockResolvedValue([]),
    };
    mockKafka = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      publishTransactionEvent: vi.fn().mockResolvedValue(undefined),
    };
    service = new OutboxReplayService(mockOutboxRepo, mockKafka, 1_000_000, 100);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    service.stopReplayLoop();
  });

  describe("startReplayLoop", () => {
    it("should fetch unpublished entries immediately on start", async () => {
      const findUnpublished = vi.mocked(mockOutboxRepo.findUnpublished).mockResolvedValue([makeEntry()]);

      service.startReplayLoop();
      await vi.waitFor(() => {
        expect(findUnpublished).toHaveBeenCalledTimes(1);
      });
    });

    it("should publish each unpublished entry to Kafka", async () => {
      vi.mocked(mockOutboxRepo.findUnpublished).mockResolvedValue([makeEntry()]);
      const publish = vi.mocked(mockKafka.publishTransactionEvent);

      service.startReplayLoop();
      await vi.waitFor(() => {
        expect(publish).toHaveBeenCalledTimes(1);
      });
    });

    it("should mark entries as published after successful publish", async () => {
      vi.mocked(mockOutboxRepo.findUnpublished).mockResolvedValue([makeEntry()]);
      const markAsPublished = vi.mocked(mockOutboxRepo.markAsPublished);

      service.startReplayLoop();
      await vi.waitFor(() => {
        expect(markAsPublished).toHaveBeenCalledWith("tx_1");
      });
    });

    it("should not throw when a single publish fails", async () => {
      const entry1 = makeEntry({ id: "ob_1", transactionId: "tx_1" });
      const entry2 = makeEntry({ id: "ob_2", transactionId: "tx_2" });
      vi.mocked(mockOutboxRepo.findUnpublished).mockResolvedValue([entry1, entry2]);
      vi.mocked(mockKafka.publishTransactionEvent).mockRejectedValueOnce(new Error("Kafka down"));

      service.startReplayLoop();
      await vi.waitFor(() => {
        expect(mockOutboxRepo.markAsPublished).toHaveBeenCalledTimes(1);
        expect(mockKafka.publishTransactionEvent).toHaveBeenCalledTimes(2);
      });
    });

    it("should not start a second interval if already running", async () => {
      vi.mocked(mockOutboxRepo.findUnpublished).mockResolvedValue([makeEntry()]);

      service.startReplayLoop();
      service.startReplayLoop();
      await vi.waitFor(() => {
        expect(mockOutboxRepo.findUnpublished).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("stopReplayLoop", () => {
    it("should not call findUnpublished again after stopping", async () => {
      vi.useFakeTimers();
      vi.mocked(mockOutboxRepo.findUnpublished).mockResolvedValue([]);
      service = new OutboxReplayService(mockOutboxRepo, mockKafka, 1000, 100);

      service.startReplayLoop();
      await vi.waitFor(() => {
        expect(mockOutboxRepo.findUnpublished).toHaveBeenCalledTimes(1);
      });

      service.stopReplayLoop();
      const callsBefore = mockOutboxRepo.findUnpublished.mock.calls.length;

      await vi.advanceTimersByTimeAsync(5000);
      expect(mockOutboxRepo.findUnpublished).toHaveBeenCalledTimes(callsBefore);

      vi.useRealTimers();
    });
  });

  describe("replay interval", () => {
    it("should call findUnpublished on each interval tick", async () => {
      vi.useFakeTimers();
      vi.mocked(mockOutboxRepo.findUnpublished).mockResolvedValue([]);
      service = new OutboxReplayService(mockOutboxRepo, mockKafka, 1000, 100);

      service.startReplayLoop();
      expect(mockOutboxRepo.findUnpublished).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockOutboxRepo.findUnpublished).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1000);
      expect(mockOutboxRepo.findUnpublished).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });

  describe("no unpublished entries", () => {
    it("should not publish when there are no entries", async () => {
      vi.mocked(mockOutboxRepo.findUnpublished).mockResolvedValue([]);

      service.startReplayLoop();
      await vi.waitFor(() => {
        expect(mockOutboxRepo.findUnpublished).toHaveBeenCalled();
      });
      expect(mockKafka.publishTransactionEvent).not.toHaveBeenCalled();
    });
  });
});
