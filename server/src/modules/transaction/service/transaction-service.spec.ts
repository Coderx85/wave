import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ITransaction } from "./transaction-service.interface";

const { saveMock } = vi.hoisted(() => ({
  saveMock: vi.fn(),
}));

vi.mock("../repository", () => ({
  TransactionRepository: function TransactionRepositoryMock(this: {
    save: typeof saveMock;
  }) {
    this.save = saveMock;
  },
}));

import { TransactionModule } from "./transaction-service";

describe("TransactionModule", () => {
  let transactionModule: TransactionModule;

  const mockTransaction: Omit<ITransaction, "id" | "status"> = {
    amount: "5000",
    userId: "user_123" as ITransaction["userId"],
    senderAccountId: "account_sender" as ITransaction["senderAccountId"],
    senderName: "Sender User",
    receiverAccountId: "account_receiver" as ITransaction["receiverAccountId"],
    receiverName: "Receiver User",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("123");
    transactionModule = new TransactionModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should create a new transaction with pending status", async () => {
      const createdTransaction: ITransaction = {
        ...mockTransaction,
        id: "transaction_123" as ITransaction["id"],
        status: "pending",
      };

      saveMock.mockResolvedValue(undefined);

      const result = await transactionModule.create(mockTransaction);

      expect(result).toEqual(createdTransaction);
      expect(saveMock).toHaveBeenCalledTimes(1);
    });

    it("should save the generated transaction with correct values", async () => {
      saveMock.mockResolvedValue(undefined);

      await transactionModule.create(mockTransaction);

      expect(saveMock).toHaveBeenCalledWith({
        id: "transaction_123",
        ...mockTransaction,
        status: "pending",
      });
    });
  });
});