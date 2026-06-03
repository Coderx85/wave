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
  let mockCache: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn>; getOrSet: ReturnType<typeof vi.fn> };

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

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      getOrSet: vi.fn(),
    };

    repository = new LedgerRepository(mockDb, mockCache);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create method", () => {
    it("should invalidate ledger cache on creation", async () => {
        const entryData = createMockLedgerEntry();
        const returningMock = vi.fn().mockResolvedValue([entryData]);
        const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
        (mockDb.insert as any).mockReturnValue({ values: valuesMock });

        await repository.create({
            transactionId: entryData.transactionId,
            amount: entryData.amount,
            entryType: entryData.entryType,
        });

        expect(mockCache.del).toHaveBeenCalledWith(`ledger-by-tx:${entryData.transactionId}`);
    });
  });

  describe("findByTransactionId method", () => {
    it("should fetch from DB and set to cache on cache miss", async () => {
        const entryData = createMockLedgerEntry();
        (mockCache.getOrSet as any).mockImplementation(async (key: any, fn: any) => {
            return await fn();
        });
        (mockDb.query.LedgerTable.findMany as any).mockResolvedValue([entryData]);

        const result = await repository.findByTransactionId(entryData.transactionId);

        expect(result).toEqual([entryData]);
        expect(mockCache.getOrSet).toHaveBeenCalledWith(`ledger-by-tx:${entryData.transactionId}`, expect.any(Function), 3600);
        expect(mockDb.query.LedgerTable.findMany).toHaveBeenCalled();
    });
  });

  describe("update method", () => {
    it("should invalidate ledger cache on update", async () => {
        const entryData = createMockLedgerEntry();
        (mockDb.query.LedgerTable.findFirst as any).mockResolvedValue(entryData);
        const executeMock = vi.fn().mockResolvedValue(undefined);
        const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        (mockDb.update as any).mockReturnValue({ set: setMock });

        await repository.update(entryData.id, { amount: 1500 });

        expect(mockCache.del).toHaveBeenCalledWith(`ledger-by-tx:${entryData.transactionId}`);
    });
  });

  describe("delete method", () => {
    it("should invalidate ledger cache on delete", async () => {
        const entryData = createMockLedgerEntry();
        (mockDb.query.LedgerTable.findFirst as any).mockResolvedValue(entryData);
        const executeMock = vi.fn().mockResolvedValue(undefined);
        const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
        (mockDb.delete as any).mockReturnValue({ where: whereMock });

        await repository.delete(entryData.id);

        expect(mockCache.del).toHaveBeenCalledWith(`ledger-by-tx:${entryData.transactionId}`);
    });
  });
});
