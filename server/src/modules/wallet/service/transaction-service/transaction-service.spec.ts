import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ITransaction } from "./transaction-service.interface";

const { saveMock, calculateNewBalanceMock, updateBalanceMock, findByUserIdMock, successfulTransactionsMock, failedTransactionsMock } = vi.hoisted(() => ({
  saveMock: vi.fn(),
  calculateNewBalanceMock: vi.fn(),
  updateBalanceMock: vi.fn(),
  findByUserIdMock: vi.fn(),
  successfulTransactionsMock: vi.fn(),
  failedTransactionsMock: vi.fn(),
}));

vi.mock("@/lib/try-catch-wrapper", () => ({
  tryCatch: async ({ ctx, errorMessage }: { ctx: () => Promise<any>, errorMessage: string }) => {
    try {
      return await ctx();
    } catch (error) {
      console.error(errorMessage, error);
      throw error;
    }
  },
}));

vi.mock("../../repository", () => ({
  TransactionRepository: function TransactionRepositoryMock(this: {
    save: typeof saveMock;
    findByUserId: typeof findByUserIdMock;
    successfulTransactions: typeof successfulTransactionsMock;
    failedTransactions: typeof failedTransactionsMock;
  }) {
    this.save = saveMock;
    this.findByUserId = findByUserIdMock;
    this.successfulTransactions = successfulTransactionsMock;
    this.failedTransactions = failedTransactionsMock;
  },
  AccountRepository: function AccountRepositoryMock(this: {
    calculateNewBalance: typeof calculateNewBalanceMock;
    updateBalance: typeof updateBalanceMock;
  }) {
    this.calculateNewBalance = calculateNewBalanceMock;
    this.updateBalance = updateBalanceMock;
  },
}));

vi.mock("globalThis", async () => {
  const actual = await vi.importActual("globalThis");
  return {
    ...actual,
    crypto: {
      ...globalThis.crypto,
      randomUUID: vi.fn(() => "123e4567-e89b-12d3-a456-426614174000"),
    },
  };
});

import { TransactionModule } from "../transaction-service";

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
    calculateNewBalanceMock.mockResolvedValue(BigInt(10000));
    updateBalanceMock.mockResolvedValue(undefined);
    saveMock.mockResolvedValue(undefined);
    transactionModule = new TransactionModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should create a new transaction with pending status", async () => {
      const createdTransaction: ITransaction = {
        ...mockTransaction,
        id: "transaction_123e4567-e89b-12d3-a456-426614174000" as ITransaction["id"],
        status: "pending",
      };

      const result = await transactionModule.create(mockTransaction);

      expect(result).toEqual(createdTransaction);
      expect(saveMock).toHaveBeenCalledTimes(1);
    });

    it("should calculate new balance for sender account", async () => {
      await transactionModule.create(mockTransaction);

      // First call: validates sender can afford (positive amount as number)
      expect(calculateNewBalanceMock).toHaveBeenNthCalledWith(
        1,
        "account_sender",
        "5000"
      );

      // Second call: calculates balance after debit (negative amount as number)
      expect(calculateNewBalanceMock).toHaveBeenNthCalledWith(
        2,
        "account_sender",
        -5000
      );

      // Third call: calculates receiver's new balance (positive amount as number)
      expect(calculateNewBalanceMock).toHaveBeenNthCalledWith(
        3,
        "account_receiver",
        5000
      );
    });

    it("should update both sender and receiver account balances", async () => {
      await transactionModule.create(mockTransaction);

      expect(updateBalanceMock).toHaveBeenCalledTimes(2);
      expect(updateBalanceMock).toHaveBeenNthCalledWith(1, "account_sender", BigInt(10000));
      expect(updateBalanceMock).toHaveBeenNthCalledWith(2, "account_receiver", BigInt(10000));
    });

    it("should save transaction with converted amount to BigInt", async () => {
      await transactionModule.create(mockTransaction);

      const callArgs = saveMock.mock.calls[0][0];
      expect(callArgs.amount).toBe(BigInt(5000));
      expect(callArgs.status).toBe("pending");
      expect(callArgs.id).toBe("transaction_123e4567-e89b-12d3-a456-426614174000");
    });

    it("should return transaction with string amount", async () => {
      const result = await transactionModule.create(mockTransaction);

      expect(result.amount).toBe("5000");
      expect(typeof result.amount).toBe("string");
    });

    it("should throw error if balance calculation fails", async () => {
      calculateNewBalanceMock.mockRejectedValueOnce(new Error("Insufficient funds"));

      await expect(transactionModule.create(mockTransaction)).rejects.toThrow();
    });

    it("should throw error if balance update fails", async () => {
      updateBalanceMock.mockRejectedValueOnce(new Error("Database error"));

      await expect(transactionModule.create(mockTransaction)).rejects.toThrow();
    });

    it("should throw error if transaction save fails", async () => {
      saveMock.mockRejectedValueOnce(new Error("Save failed"));

      await expect(transactionModule.create(mockTransaction)).rejects.toThrow();
    });
  });

  describe("list", () => {
    it("should retrieve all transactions for a user", async () => {
      const mockTransactions = [
        {
          id: "tx_1" as ITransaction["id"],
          amount: BigInt(5000),
          userId: "user_123" as ITransaction["userId"],
          senderAccountId: "account_1" as ITransaction["senderAccountId"],
          senderName: "Sender",
          receiverAccountId: "account_2" as ITransaction["receiverAccountId"],
          receiverName: "Receiver",
          status: "success" as const,
          createdAt: new Date(),
        },
      ];

      findByUserIdMock.mockResolvedValue(mockTransactions);

      const result = await transactionModule.list("user_123" as any);

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(5000);
      expect(typeof result[0].amount).toBe("number");
    });

    it("should convert BigInt amount to number", async () => {
      findByUserIdMock.mockResolvedValue([
        {
          id: "tx_1" as ITransaction["id"],
          amount: BigInt(12345),
          userId: "user_123" as ITransaction["userId"],
          senderAccountId: "account_1" as ITransaction["senderAccountId"],
          senderName: "Sender",
          receiverAccountId: "account_2" as ITransaction["receiverAccountId"],
          receiverName: "Receiver",
          status: "success" as const,
          createdAt: new Date(),
        },
      ]);

      const result = await transactionModule.list("user_123" as any);

      expect(result[0].amount).toBe(12345);
    });

    it("should throw error if listing fails", async () => {
      findByUserIdMock.mockRejectedValue(new Error("Database error"));

      await expect(transactionModule.list("user_123" as any)).rejects.toThrow();
    });
  });

  describe("query", () => {
    const userId = "user_123" as any;

    it("should retrieve successful transactions", async () => {
      const mockTransactions = [
        {
          id: "tx_1" as ITransaction["id"],
          amount: BigInt(5000),
          userId,
          senderAccountId: "account_1" as ITransaction["senderAccountId"],
          senderName: "Sender",
          receiverAccountId: "account_2" as ITransaction["receiverAccountId"],
          receiverName: "Receiver",
          status: "success" as const,
          createdAt: new Date(),
        },
      ];

      successfulTransactionsMock.mockResolvedValue(mockTransactions);

      const result = await transactionModule.query({ status: "success" }, userId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("success");
      expect(result[0].amount).toBe(5000);
    });

    it("should retrieve failed transactions", async () => {
      const mockTransactions = [
        {
          id: "tx_2" as ITransaction["id"],
          amount: BigInt(1000),
          userId,
          senderAccountId: "account_1" as ITransaction["senderAccountId"],
          senderName: "Sender",
          receiverAccountId: "account_2" as ITransaction["receiverAccountId"],
          receiverName: "Receiver",
          status: "failed" as const,
          createdAt: new Date(),
        },
      ];

      failedTransactionsMock.mockResolvedValue(mockTransactions);

      const result = await transactionModule.query({ status: "failed" }, userId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("failed");
    });

    it("should apply date range filter", async () => {
      const dateRange = {
        from: new Date("2024-01-01"),
        to: new Date("2024-01-31"),
      };

      successfulTransactionsMock.mockResolvedValue([]);

      await transactionModule.query({ status: "success", dateRange }, userId);

      expect(successfulTransactionsMock).toHaveBeenCalledWith({
        userId,
        dateRange,
      });
    });

    it("should convert BigInt amount to number in query results", async () => {
      const mockTransactions = [
        {
          id: "tx_1" as ITransaction["id"],
          amount: BigInt(99999),
          userId,
          senderAccountId: "account_1" as ITransaction["senderAccountId"],
          senderName: "Sender",
          receiverAccountId: "account_2" as ITransaction["receiverAccountId"],
          receiverName: "Receiver",
          status: "success" as const,
          createdAt: new Date(),
        },
      ];

      successfulTransactionsMock.mockResolvedValue(mockTransactions);

      const result = await transactionModule.query({ status: "success" }, userId);

      expect(result[0].amount).toBe(99999);
      expect(typeof result[0].amount).toBe("number");
    });

    it("should throw error for invalid status", async () => {
      await expect(
        transactionModule.query({ status: "invalid" as any }, userId)
      ).rejects.toThrow();
    });

    it("should throw error if query fails", async () => {
      successfulTransactionsMock.mockRejectedValue(new Error("Database error"));

      await expect(
        transactionModule.query({ status: "success" }, userId)
      ).rejects.toThrow();
    });
  });
});