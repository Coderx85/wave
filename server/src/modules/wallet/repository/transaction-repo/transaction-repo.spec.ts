import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ITransactionDBDTO } from "./transaction-repo.interface";
import type { TTransactionId, TBankAccountNumber, TUserId } from "../../../../types";
import { TransactionRepository } from "../transaction-repo";
import type { DrizzleDb } from "@/lib/repository/base-repository";
import { eq } from "drizzle-orm";

vi.mock("drizzle-orm", async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
      ...actual,
      eq: vi.fn(),
      between: vi.fn(),
      or: vi.fn(),
      defineRelations: vi.fn(),
      relations: vi.fn(),
    };
});

describe("TransactionRepository", () => {
  let repository: TransactionRepository;
  let mockDb: DrizzleDb;
  let mockCache: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn>; getOrSet: ReturnType<typeof vi.fn> };

  const createMockTransaction = (
    overrides?: Partial<ITransactionDBDTO>
  ): ITransactionDBDTO => ({
    id: `txn_${Math.random()}` as TTransactionId,
    userId: "user_123" as TUserId,
    amount: BigInt(1000),
    senderAccountNumber: `1111111111` as TBankAccountNumber,
    senderName: "Sender User",
    receiverAccountNumber: `2222222222` as TBankAccountNumber,
    receiverName: "Receiver User",
    status: "pending",
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      insert: vi.fn(),
      query: {
        TransactionsTable: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      update: vi.fn(),
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockDb)),
    } as unknown as DrizzleDb;

    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      getOrSet: vi.fn(),
    };

    repository = new TransactionRepository(mockDb, mockCache);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("save method", () => {
    it("should invalidate user transactions cache on save", async () => {
        const transactionData = createMockTransaction();
        const valuesMock = vi.fn().mockReturnValue(undefined);
        (mockDb.insert as any).mockReturnValue({ values: valuesMock });

        await repository.save(transactionData);

        expect(mockCache.del).toHaveBeenCalledWith(`user-transactions:${transactionData.userId}`);
    });
  });

  describe("update method", () => {
    it("should invalidate transaction and user transactions caches on update", async () => {
        const transactionData = createMockTransaction({ status: "success" });
        const returningMock = vi.fn().mockResolvedValue([transactionData]);
        const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        (mockDb.update as any).mockReturnValue({ set: setMock });

        await repository.update(transactionData);

        expect(mockCache.del).toHaveBeenCalledWith(`transaction:${transactionData.id}`);
        expect(mockCache.del).toHaveBeenCalledWith(`user-transactions:${transactionData.userId}`);
    });
  });

  describe("findById method", () => {
    it("should fetch from DB and set to cache on cache miss", async () => {
        const transactionData = createMockTransaction();
        (mockCache.getOrSet as any).mockImplementation(async (key: any, fn: any) => {
            return await fn();
        });
        (mockDb.query.TransactionsTable.findFirst as any).mockResolvedValue(transactionData);

        const result = await repository.findById(transactionData.id);

        expect(result).toEqual(transactionData);
        expect(mockCache.getOrSet).toHaveBeenCalledWith(`transaction:${transactionData.id}`, expect.any(Function), 3600);
        expect(mockDb.query.TransactionsTable.findFirst).toHaveBeenCalled();
    });
  });

  describe("findByUserId method", () => {
    it("should fetch from DB and set to cache on cache miss", async () => {
        const userId = "user_123" as TUserId;
        const transactionData = createMockTransaction({ userId });
        (mockCache.getOrSet as any).mockImplementation(async (key: any, fn: any) => {
            return await fn();
        });
        (mockDb.query.TransactionsTable.findMany as any).mockResolvedValue([transactionData]);

        const result = await repository.findByUserId(userId);

        expect(result).toEqual([transactionData]);
        expect(mockCache.getOrSet).toHaveBeenCalledWith(`user-transactions:${userId}`, expect.any(Function), 3600);
        expect(mockDb.query.TransactionsTable.findMany).toHaveBeenCalled();
    });
  });
});
