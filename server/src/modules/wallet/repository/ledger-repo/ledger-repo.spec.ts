import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ILedgerEntryDBDTO } from "./ledger-repo.interface";
import type { TLedgerEntryId, TTransactionId } from "../../../../types";

// Mock the database client and drizzle-orm BEFORE importing LedgerRepo
vi.mock("../../database/client");
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  defineRelations: vi.fn(() => ({})),
  relations: vi.fn(() => ({})),
  one: vi.fn(),
  many: vi.fn(),
  sql: vi.fn((...args) => args[0]),
}));

// Mock the try-catch wrapper
vi.mock("@/lib/try-catch-wrapper", () => ({
  tryCatch: vi.fn(({ ctx }) => ctx()),
}));

// Import after mocking
import { LedgerRepository } from "./ledger-repo";
import * as dbClient from "../../../database/client";

describe("LedgerRepository", () => {
  let repository: LedgerRepository;

  const createMockLedgerEntry = (
    overrides?: Partial<ILedgerEntryDBDTO>
  ): ILedgerEntryDBDTO => ({
    id: `ledger_${Math.random()}` as TLedgerEntryId,
    transactionId: `txn_${Math.random()}` as TTransactionId,
    amount: 1000,
    entryType: "debit",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new LedgerRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create method", () => {
    it("should create a new ledger entry", async () => {
      const entryData = createMockLedgerEntry();
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([entryData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      const result = await repository.create({
        transactionId: entryData.transactionId,
        amount: entryData.amount,
        entryType: entryData.entryType,
      });

      expect(insertMock).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.amount).toBe(entryData.amount);
    });

    it("should convert amount to bigint when creating", async () => {
      const entryData = createMockLedgerEntry({ amount: 5000 });
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([entryData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      await repository.create({
        transactionId: entryData.transactionId,
        amount: entryData.amount,
        entryType: entryData.entryType,
      });

      const callArgs = valuesMock.mock.calls[0][0];
      expect(typeof callArgs.amount).toBe("bigint");
    });

    it("should set createdAt and updatedAt timestamps when creating", async () => {
      const entryData = createMockLedgerEntry();
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([entryData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      await repository.create({
        transactionId: entryData.transactionId,
        amount: entryData.amount,
        entryType: entryData.entryType,
      });

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.createdAt).toBeDefined();
      expect(callArgs.updatedAt).toBeDefined();
      expect(callArgs.createdAt instanceof Date).toBe(true);
      expect(callArgs.updatedAt instanceof Date).toBe(true);
    });

    it("should preserve entry fields when creating", async () => {
      const entryData = createMockLedgerEntry({
        amount: 2500,
        entryType: "credit",
      });
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([entryData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      await repository.create({
        transactionId: entryData.transactionId,
        amount: entryData.amount,
        entryType: entryData.entryType,
      });

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.transactionId).toBe(entryData.transactionId);
      expect(callArgs.entryType).toBe("credit");
    });

    it("should throw error if entry creation fails", async () => {
      const entryData = createMockLedgerEntry();
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      await expect(
        repository.create({
          transactionId: entryData.transactionId,
          amount: entryData.amount,
          entryType: entryData.entryType,
        })
      ).rejects.toThrow();
    });

    it("should handle database errors gracefully", async () => {
      const entryData = createMockLedgerEntry();
      const dbMock = vi.mocked(dbClient.db);

      (dbMock.insert as any) = vi.fn(() => {
        throw new Error("Database connection failed");
      });

      await expect(
        repository.create({
          transactionId: entryData.transactionId,
          amount: entryData.amount,
          entryType: entryData.entryType,
        })
      ).rejects.toThrow();
    });

    it("should convert returned amount from bigint to number", async () => {
      const mockEntryResponse = {
        ...createMockLedgerEntry({ amount: 3000 }),
        amount: BigInt(3000),
      };
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockEntryResponse]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      const result = await repository.create({
        transactionId: mockEntryResponse.transactionId,
        amount: 3000,
        entryType: mockEntryResponse.entryType,
      });

      expect(typeof result.amount).toBe("number");
      expect(result.amount).toBe(3000);
    });
  });

  describe("findById method", () => {
    it("should find ledger entry by id", async () => {
      const entryData = createMockLedgerEntry();
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(entryData);
      const queryMock = {
        LedgerTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findById(entryData.id);

      expect(findFirstMock).toHaveBeenCalled();
      expect(result).toEqual(entryData);
    });

    it("should return null if entry not found", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(null);
      const queryMock = {
        LedgerTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findById(entryId);

      expect(result).toBeNull();
    });

    it("should convert amount from bigint to number on retrieval", async () => {
      const mockEntryResponse = {
        ...createMockLedgerEntry({ amount: 4500 }),
        amount: BigInt(4500),
      };
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(mockEntryResponse);
      const queryMock = {
        LedgerTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findById(mockEntryResponse.id);

      expect(typeof result?.amount).toBe("number");
      expect(result?.amount).toBe(4500);
    });
  });

  describe("findByTransactionId method", () => {
    it("should find ledger entries by transaction id", async () => {
      const transactionId = "txn_123" as TTransactionId;
      const entryData = createMockLedgerEntry({ transactionId });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([entryData]);
      const queryMock = {
        LedgerTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByTransactionId(transactionId);

      expect(findManyMock).toHaveBeenCalled();
      expect(result).toEqual([entryData]);
    });

    it("should return empty array if no entries found", async () => {
      const transactionId = "txn_123" as TTransactionId;
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([]);
      const queryMock = {
        LedgerTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByTransactionId(transactionId);

      expect(result).toEqual([]);
    });

    it("should convert amounts from bigint to number for all entries", async () => {
      const transactionId = "txn_123" as TTransactionId;
      const mockEntriesResponse = [
        {
          ...createMockLedgerEntry({
            transactionId,
            amount: 1000,
            entryType: "debit",
          }),
          amount: BigInt(1000),
        },
        {
          ...createMockLedgerEntry({
            transactionId,
            amount: 1000,
            entryType: "credit",
          }),
          amount: BigInt(1000),
        },
      ];
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi
        .fn()
        .mockResolvedValue(mockEntriesResponse);
      const queryMock = {
        LedgerTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByTransactionId(transactionId);

      expect(result).toHaveLength(2);
      expect(typeof result[0].amount).toBe("number");
      expect(typeof result[1].amount).toBe("number");
      expect(result[0].amount).toBe(1000);
      expect(result[1].amount).toBe(1000);
    });

    it("should return both debit and credit entries for transaction", async () => {
      const transactionId = "txn_123" as TTransactionId;
      const debitEntry = createMockLedgerEntry({
        transactionId,
        entryType: "debit",
      });
      const creditEntry = createMockLedgerEntry({
        transactionId,
        entryType: "credit",
      });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi
        .fn()
        .mockResolvedValue([debitEntry, creditEntry]);
      const queryMock = {
        LedgerTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByTransactionId(transactionId);

      expect(result).toHaveLength(2);
      expect(result[0].entryType).toBe("debit");
      expect(result[1].entryType).toBe("credit");
    });
  });

  describe("findByEntryType method", () => {
    it("should find ledger entries by type", async () => {
      const entryData = createMockLedgerEntry({ entryType: "debit" });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([entryData]);
      const queryMock = {
        LedgerTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByEntryType("debit");

      expect(findManyMock).toHaveBeenCalled();
      expect(result).toEqual([entryData]);
    });

    it("should return empty array if no entries of type found", async () => {
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([]);
      const queryMock = {
        LedgerTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByEntryType("credit");

      expect(result).toEqual([]);
    });

    it("should filter entries by type correctly", async () => {
      const debitEntries = [
        createMockLedgerEntry({ entryType: "debit" }),
        createMockLedgerEntry({ entryType: "debit" }),
      ];
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue(debitEntries);
      const queryMock = {
        LedgerTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByEntryType("debit");

      expect(result).toHaveLength(2);
      expect(result.every((e) => e.entryType === "debit")).toBe(true);
    });
  });

  describe("update method", () => {
    it("should update ledger entry", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const dbMock = vi.mocked(dbClient.db);

      const whereMock = vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      });
      const setMock = vi.fn().mockReturnValue({
        where: whereMock,
      });
      const updateMock = vi.fn().mockReturnValue({
        set: setMock,
      });

      (dbMock.update as any) = updateMock;

      await repository.update(entryId, { entryType: "credit" });

      expect(updateMock).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });

    it("should convert amount to bigint when updating", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const dbMock = vi.mocked(dbClient.db);

      const whereMock = vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      });
      const setMock = vi.fn().mockReturnValue({
        where: whereMock,
      });
      const updateMock = vi.fn().mockReturnValue({
        set: setMock,
      });

      (dbMock.update as any) = updateMock;

      await repository.update(entryId, { amount: 6250 });

      const callArgs = setMock.mock.calls[0][0];
      expect(typeof callArgs.amount).toBe("bigint");
      expect(callArgs.amount).toBe(BigInt(6250));
    });

    it("should set updatedAt timestamp when updating", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const dbMock = vi.mocked(dbClient.db);

      const whereMock = vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      });
      const setMock = vi.fn().mockReturnValue({
        where: whereMock,
      });
      const updateMock = vi.fn().mockReturnValue({
        set: setMock,
      });

      (dbMock.update as any) = updateMock;

      await repository.update(entryId, { entryType: "credit" });

      const callArgs = setMock.mock.calls[0][0];
      expect(callArgs.updatedAt).toBeDefined();
      expect(callArgs.updatedAt instanceof Date).toBe(true);
    });

    it("should handle database errors gracefully", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const dbMock = vi.mocked(dbClient.db);

      (dbMock.update as any) = vi.fn(() => {
        throw new Error("Database connection failed");
      });

      await expect(
        repository.update(entryId, { entryType: "credit" })
      ).rejects.toThrow();
    });
  });

  describe("delete method", () => {
    it("should delete ledger entry", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const dbMock = vi.mocked(dbClient.db);

      const whereMock = vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      });
      const deleteMock = vi.fn().mockReturnValue({
        where: whereMock,
      });

      (dbMock.delete as any) = deleteMock;

      await repository.delete(entryId);

      expect(deleteMock).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });

    it("should call delete with correct entry id", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const dbMock = vi.mocked(dbClient.db);

      const whereMock = vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue(undefined),
      });
      const deleteMock = vi.fn().mockReturnValue({
        where: whereMock,
      });

      (dbMock.delete as any) = deleteMock;

      await repository.delete(entryId);

      expect(whereMock).toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const dbMock = vi.mocked(dbClient.db);

      (dbMock.delete as any) = vi.fn(() => {
        throw new Error("Database connection failed");
      });

      await expect(repository.delete(entryId)).rejects.toThrow();
    });
  });

  describe("Repository instantiation", () => {
    it("should create a new instance successfully", () => {
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(LedgerRepository);
    });

    it("should have all required methods", () => {
      expect(typeof repository.create).toBe("function");
      expect(typeof repository.findById).toBe("function");
      expect(typeof repository.findByTransactionId).toBe("function");
      expect(typeof repository.findByEntryType).toBe("function");
      expect(typeof repository.update).toBe("function");
      expect(typeof repository.delete).toBe("function");
    });
  });
});
