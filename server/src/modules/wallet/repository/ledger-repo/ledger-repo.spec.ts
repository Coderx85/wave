import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ILedgerEntryDBDTO } from "./ledger-repo.interface";
import type { TLedgerEntryId, TTransactionId } from "../../../../types";
import { LedgerRepository } from "./ledger-repo";
import type { DrizzleDb } from "@/lib/repository/base-repository";
import { eq } from "drizzle-orm";

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    eq: vi.fn(),
    defineRelations: vi.fn(),
    relations: vi.fn(),
  };
});

describe("LedgerRepository", () => {
  let repository: LedgerRepository;
  let mockDb: DrizzleDb;

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
    mockDb = {
      insert: vi.fn(),
      query: {
        LedgerTable: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as DrizzleDb;
    repository = new LedgerRepository(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create method", () => {
    it("should create a new ledger entry", async () => {
      const entryData = createMockLedgerEntry();
      const returningMock = vi.fn().mockResolvedValue([entryData]);
      const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });

      const result = await repository.create({
        transactionId: entryData.transactionId,
        amount: entryData.amount,
        entryType: entryData.entryType,
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.amount).toBe(entryData.amount);
    });

    it("should convert amount to bigint when creating", async () => {
      const entryData = createMockLedgerEntry({ amount: 5000 });
      const returningMock = vi.fn().mockResolvedValue([entryData]);
      const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });

      await repository.create({
        transactionId: entryData.transactionId,
        amount: entryData.amount,
        entryType: entryData.entryType,
      });

      const callArgs = valuesMock.mock.calls[0][0];
      expect(typeof callArgs.amount).toBe("bigint");
    });

    it("should throw error if entry creation fails", async () => {
      const entryData = createMockLedgerEntry();
      const returningMock = vi.fn().mockResolvedValue([]);
      const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });

      await expect(
        repository.create({
          transactionId: entryData.transactionId,
          amount: entryData.amount,
          entryType: entryData.entryType,
        })
      ).rejects.toThrow("Failed to create ledger entry");
    });

    it("should convert returned amount from bigint to number", async () => {
        const mockEntryResponse = {
            ...createMockLedgerEntry({ amount: 3000 }),
            amount: BigInt(3000),
        };
        const returningMock = vi.fn().mockResolvedValue([mockEntryResponse]);
        const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
        (mockDb.insert as any).mockReturnValue({ values: valuesMock });

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
      (mockDb.query.LedgerTable.findFirst as any).mockResolvedValue(entryData);

      const result = await repository.findById(entryData.id);

      expect(mockDb.query.LedgerTable.findFirst).toHaveBeenCalled();
      expect(result).toEqual(entryData);
    });

    it("should return null if entry not found", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      (mockDb.query.LedgerTable.findFirst as any).mockResolvedValue(null);

      const result = await repository.findById(entryId);

      expect(result).toBeNull();
    });

    it("should convert amount from bigint to number on retrieval", async () => {
        const mockEntryResponse = {
            ...createMockLedgerEntry({ amount: 4500 }),
            amount: BigInt(4500),
        };
        (mockDb.query.LedgerTable.findFirst as any).mockResolvedValue(mockEntryResponse);

        const result = await repository.findById(mockEntryResponse.id);

        expect(typeof result?.amount).toBe("number");
        expect(result?.amount).toBe(4500);
    });
  });

  describe("findByTransactionId method", () => {
    it("should find ledger entries by transaction id", async () => {
      const transactionId = "txn_123" as TTransactionId;
      const entryData = createMockLedgerEntry({ transactionId });
      (mockDb.query.LedgerTable.findMany as any).mockResolvedValue([entryData]);

      const result = await repository.findByTransactionId(transactionId);

      expect(mockDb.query.LedgerTable.findMany).toHaveBeenCalled();
      expect(result).toEqual([entryData]);
    });

    it("should return empty array if no entries found", async () => {
        const transactionId = "txn_123" as TTransactionId;
        (mockDb.query.LedgerTable.findMany as any).mockResolvedValue([]);

        const result = await repository.findByTransactionId(transactionId);

        expect(result).toEqual([]);
    });
  });

  describe("findByEntryType method", () => {
    it("should find ledger entries by type", async () => {
        const entryData = createMockLedgerEntry({ entryType: "debit" });
        (mockDb.query.LedgerTable.findMany as any).mockResolvedValue([entryData]);

        const result = await repository.findByEntryType("debit");

        expect(mockDb.query.LedgerTable.findMany).toHaveBeenCalled();
        expect(result).toEqual([entryData]);
    });
  });

  describe("update method", () => {
    it("should update ledger entry", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const executeMock = vi.fn().mockResolvedValue(undefined);
      const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
      const setMock = vi.fn().mockReturnValue({ where: whereMock });
      (mockDb.update as any).mockReturnValue({ set: setMock });

      await repository.update(entryId, { entryType: "credit" });

      expect(mockDb.update).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({
        entryType: "credit",
        updatedAt: expect.any(Date),
      });
      expect(whereMock).toHaveBeenCalledWith(eq(undefined, entryId));
    });

    it("should convert amount to bigint when updating", async () => {
        const entryId = "ledger_123" as TLedgerEntryId;
        const executeMock = vi.fn().mockResolvedValue(undefined);
        const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        (mockDb.update as any).mockReturnValue({ set: setMock });

        await repository.update(entryId, { amount: 6250 });

        const callArgs = setMock.mock.calls[0][0];
        expect(typeof callArgs.amount).toBe("bigint");
        expect(callArgs.amount).toBe(BigInt(6250));
    });
  });

  describe("delete method", () => {
    it("should delete ledger entry", async () => {
      const entryId = "ledger_123" as TLedgerEntryId;
      const executeMock = vi.fn().mockResolvedValue(undefined);
      const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
      (mockDb.delete as any).mockReturnValue({ where: whereMock });

      await repository.delete(entryId);

      expect(mockDb.delete).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalledWith(eq(undefined, entryId));
    });
  });
});
