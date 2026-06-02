import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ITransactionDBDTO } from "./transaction-repo.interface";
import type { TTransactionId, TAccountId } from "../../../../types";
import { TransactionRepository } from "../transaction-repo";
import type { DrizzleDb } from "@/lib/repository/base-repository";
import { eq, between, or } from "drizzle-orm";

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

  const createMockTransaction = (
    overrides?: Partial<ITransactionDBDTO>
  ): ITransactionDBDTO => ({
    id: `txn_${Math.random()}` as TTransactionId,
    userId: "user_123",
    amount: BigInt(1000),
    senderAccountId: `acc_${Math.random()}` as TAccountId,
    senderName: "Sender User",
    receiverAccountId: `acc_${Math.random()}` as TAccountId,
    receiverName: "Receiver User",
    status: "pending",
    createdAt: new Date(),
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
    repository = new TransactionRepository(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("save method", () => {
    it("should save a new transaction", async () => {
      const transactionData = createMockTransaction();
      const valuesMock = vi.fn().mockReturnValue(undefined);
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });
      
      await repository.save(transactionData);

      expect(mockDb.insert).toHaveBeenCalled();
      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.status).toBe("pending");
    });
  });

  describe("update method", () => {
    it("should update a transaction", async () => {
        const transactionData = createMockTransaction({ status: "success" });
        const returningMock = vi.fn().mockResolvedValue([transactionData]);
        const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        (mockDb.update as any).mockReturnValue({ set: setMock });

        const result = await repository.update(transactionData);

        expect(mockDb.update).toHaveBeenCalled();
        expect(setMock).toHaveBeenCalledWith({
            ...transactionData,
            updatedAt: expect.any(Date),
        });
        expect(whereMock).toHaveBeenCalledWith(eq(undefined, transactionData.id));
        expect(result).toEqual(transactionData);
    });

    it("should throw an error if update fails", async () => {
        const transactionData = createMockTransaction();
        const returningMock = vi.fn().mockResolvedValue([]);
        const whereMock = vi.fn().mockReturnValue({ returning: returningMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        (mockDb.update as any).mockReturnValue({ set: setMock });

        await expect(repository.update(transactionData)).rejects.toThrow(
            `Failed to update transaction with id: ${transactionData.id}`
        );
    });
  });

  describe("findById method", () => {
    it("should find transaction by id", async () => {
      const transactionData = createMockTransaction();
      (mockDb.query.TransactionsTable.findFirst as any).mockResolvedValue(transactionData);

      const result = await repository.findById(transactionData.id);

      expect(mockDb.query.TransactionsTable.findFirst).toHaveBeenCalled();
      expect(result).toEqual(transactionData);
    });

    it("should return null if transaction not found", async () => {
      const transactionId = `txn_123` as TTransactionId;
      (mockDb.query.TransactionsTable.findFirst as any).mockResolvedValue(null);

      const result = await repository.findById(transactionId);

      expect(result).toBeNull();
    });
  });

  describe("findByUserId method", () => {
    it("should find transactions by user id", async () => {
      const userId = "user_123";
      const transactionData = createMockTransaction({ userId });
      (mockDb.query.TransactionsTable.findMany as any).mockResolvedValue([transactionData]);

      const result = await repository.findByUserId(userId);

      expect(mockDb.query.TransactionsTable.findMany).toHaveBeenCalled();
      expect(result).toEqual([transactionData]);
    });
  });

  describe("failedTransactions method", () => {
    it("should find failed transactions by user id", async () => {
      const userId = "user_123";
      const transactionData = createMockTransaction({ userId, status: "failed" });
      (mockDb.query.TransactionsTable.findMany as any).mockResolvedValue([transactionData]);

      const result = await repository.failedTransactions({ userId });

      expect(mockDb.query.TransactionsTable.findMany).toHaveBeenCalled();
      expect(result).toEqual([transactionData]);
    });
  });

  describe("successfulTransactions method", () => {
    it("should find successful transactions by user id", async () => {
      const userId = "user_123";
      const transactionData = createMockTransaction({
        userId,
        status: "success",
      });
      (mockDb.query.TransactionsTable.findMany as any).mockResolvedValue([transactionData]);

      const result = await repository.successfulTransactions({ userId });

      expect(mockDb.query.TransactionsTable.findMany).toHaveBeenCalled();
      expect(result).toEqual([transactionData]);
    });
  });
});
