import { tryCatch } from "@/lib/try-catch-wrapper";
import {
  OutboxRepository,
  type IOutboxRepository,
} from "../repository";
import { kafkaRPCClient, type IKafkaService } from "@/modules/kafka";

export class OutboxReplayService {
  private readonly outboxRepository: IOutboxRepository;
  private readonly kafkaService: IKafkaService;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private readonly replayIntervalMs: number;
  private readonly batchSize: number;

  constructor(
    outboxRepository: IOutboxRepository = new OutboxRepository(),
    kafkaService: IKafkaService = kafkaRPCClient,
    replayIntervalMs: number = 30_000,
    batchSize: number = 50,
  ) {
    this.outboxRepository = outboxRepository;
    this.kafkaService = kafkaService;
    this.replayIntervalMs = replayIntervalMs;
    this.batchSize = batchSize;
  }

  startReplayLoop(): void {
    if (this.intervalId) return;
    this.replayUnpublishedOutbox().catch((err) =>
      console.error("OutboxReplay: initial replay failed", err),
    );
    this.intervalId = setInterval(() => {
      this.replayUnpublishedOutbox().catch((err) =>
        console.error("OutboxReplay: scheduled replay failed", err),
      );
    }, this.replayIntervalMs);
  }

  stopReplayLoop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async replayUnpublishedOutbox(): Promise<void> {
    const entries = await this.outboxRepository.findUnpublished(this.batchSize);
    if (entries.length === 0) return;

    await Promise.allSettled(
      entries.map(async (entry) => {
        const payload = entry.payload;
        const event = {
          eventType: "transaction.created" as const,
          transactionId: entry.transactionId,
          userId: payload.userId,
          senderAccountNumber: payload.senderAccountNumber,
          receiverAccountNumber: payload.receiverAccountNumber,
          amount: payload.amount,
          senderName: payload.senderName,
          receiverName: payload.receiverName,
          status: payload.status,
          timestamp: payload.timestamp,
        };

        await this.kafkaService.publishTransactionEvent(event);
        await this.outboxRepository.markAsPublished(entry.transactionId);
      }),
    );
  }
}
