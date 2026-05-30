import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ILedger } from "./ledger-service.interface";

const { createMock, findByTransactionIdMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findByTransactionIdMock: vi.fn(),
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
  LedgerRepo: function LedgerRepoMock(this: {
    create: typeof createMock;
    findByTransactionId: typeof findByTransactionIdMock;
  }) {
    this.create = createMock;
    this.findByTransactionId = findByTransactionIdMock;
  },
}));

import { LedgerService } from "../ledger-service";

describe("LedgerService", () => {
  let ledgerService: LedgerService;

  const mockEntry: ILedger = {
    id: "entry_123" as any,
    transactionId: "tx_123" as any,
    amount: 1000,
    entryType: "debit",
    createdAt: new Date("2024-01-01"),
    updatedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ledgerService = new LedgerService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createEntry", () => {
    it("should create a debit entry", async () => {
      createMock.mockResolvedValue(mockEntry);

      const result = await ledgerService.createEntry("tx_123" as any, 1000, "debit");

      expect(result).toEqual(mockEntry);
      expect(result.amount).toBe(1000);
      expect(typeof result.amount).toBe("number");
    });

    it("should create a credit entry", async () => {
      const creditEntry = {
        ...mockEntry,
        entryType: "credit" as const,
        amount: 500,
      };
      createMock.mockResolvedValue(creditEntry);

      const result = await ledgerService.createEntry("tx_456" as any, 500, "credit");

      expect(result.entryType).toBe("credit");
      expect(result.amount).toBe(500);
    });

    it("should preserve amount as number", async () => {
      createMock.mockResolvedValue(mockEntry);

      const result = await ledgerService.createEntry("tx_123" as any, 1000, "debit");

      expect(result.amount).toBe(1000);
      expect(typeof result.amount).toBe("number");
    });

    it("should pass correct parameters to repository", async () => {
      createMock.mockResolvedValue(mockEntry);

      await ledgerService.createEntry("tx_123" as any, 1000, "debit");

      expect(createMock).toHaveBeenCalledWith({
        transactionId: "tx_123",
        amount: 1000,
        entryType: "debit",
      });
    });

    it("should throw error if entry creation fails", async () => {
      createMock.mockRejectedValue(new Error("Database error"));

      await expect(
        ledgerService.createEntry("tx_123" as any, 1000, "debit")
      ).rejects.toThrow();
    });
  });

  describe("getEntries", () => {
    it("should retrieve all entries for a transaction", async () => {
      const dbEntries = [
        mockEntry,
        { ...mockEntry, id: "entry_124" as any, amount: 500, entryType: "credit" as const },
      ];
      findByTransactionIdMock.mockResolvedValue(dbEntries);

      const result = await ledgerService.getEntries("tx_123" as any);

      expect(result).toHaveLength(2);
      expect(result[0].amount).toBe(1000);
      expect(result[1].amount).toBe(500);
    });

    it("should return empty array if no entries found", async () => {
      findByTransactionIdMock.mockResolvedValue([]);

      const result = await ledgerService.getEntries("tx_999" as any);

      expect(result).toEqual([]);
    });

    it("should preserve amount as number in results", async () => {
      const dbEntries = [
        { ...mockEntry, amount: 5000 },
        { ...mockEntry, id: "entry_124" as any, amount: 2500, entryType: "credit" as const },
      ];
      findByTransactionIdMock.mockResolvedValue(dbEntries);

      const result = await ledgerService.getEntries("tx_123" as any);

      result.forEach(entry => {
        expect(typeof entry.amount).toBe("number");
      });
    });

    it("should pass correct transaction ID to repository", async () => {
      findByTransactionIdMock.mockResolvedValue([]);

      await ledgerService.getEntries("tx_123" as any);

      expect(findByTransactionIdMock).toHaveBeenCalledWith("tx_123");
    });

    it("should throw error if retrieval fails", async () => {
      findByTransactionIdMock.mockRejectedValue(new Error("Database error"));

      await expect(
        ledgerService.getEntries("tx_123" as any)
      ).rejects.toThrow();
    });

    it("should preserve entry metadata", async () => {
      const dbEntries = [
        {
          ...mockEntry,
          amount: 1000,
          updatedAt: new Date("2024-01-02"),
        },
      ];
      findByTransactionIdMock.mockResolvedValue(dbEntries);

      const result = await ledgerService.getEntries("tx_123" as any);

      expect(result[0].createdAt).toEqual(new Date("2024-01-01"));
      expect(result[0].updatedAt).toEqual(new Date("2024-01-02"));
    });
  });
});
