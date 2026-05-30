import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { ITransactionDBDTO } from "./transaction-repo.interface";
import type { TTransactionId, TAccountId } from "../../../../types";

// Mock the database client and drizzle-orm BEFORE importing TransactionRepository
vi.mock("../../database/client", () => ({
  db: {
    transaction: vi.fn(async (callback) => callback({
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    })),
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    eq: vi.fn(),
    between: vi.fn(),
    or: vi.fn(),
  };
});

// Mock the try-catch wrapper
vi.mock("@/lib/try-catch-wrapper", () => ({
  tryCatch: vi.fn(({ ctx }) => ctx()),
}));

// Import after mocking
import { TransactionRepository } from "../transaction-repo";
import * as dbClient from "../../../database/client";

describe("TransactionRepository", () => {
  let repository: TransactionRepository;

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
    repository = new TransactionRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("save method", () => {
    it("should save a new transaction", async () => {
      const transactionData = createMockTransaction();
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(undefined),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.transaction as any) = vi.fn(async (callback) => {
        return callback({ insert: insertMock });
      });

      await expect(repository.save(transactionData)).resolves.not.toThrow();
      expect(insertMock).toHaveBeenCalled();
    });

    it("should convert amount to string when saving", async () => {
      const transactionData = createMockTransaction({ amount: BigInt(5000) });
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(undefined),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.transaction as any) = vi.fn(async (callback) => {
        return callback({ insert: insertMock });
      });

      await repository.save(transactionData);

      const callArgs = valuesMock.mock.calls[0][0];
      expect(typeof callArgs.amount).toBe("bigint");
      expect(callArgs.amount).toBe(BigInt(5000));
    });

    it("should set status to pending when saving", async () => {
      const transactionData = createMockTransaction({ status: "success" });
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(undefined),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.transaction as any) = vi.fn(async (callback) => {
        return callback({ insert: insertMock });
      });

      await repository.save(transactionData);

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.status).toBe("pending");
    });

    it("should set createdAt timestamp when saving", async () => {
      const transactionData = createMockTransaction();
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(undefined),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.transaction as any) = vi.fn(async (callback) => {
        return callback({ insert: insertMock });
      });

      await repository.save(transactionData);

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.createdAt).toBeDefined();
      expect(callArgs.createdAt instanceof Date).toBe(true);
    });

    it("should preserve transaction fields when saving", async () => {
      const transactionData = createMockTransaction({
        amount: BigInt(2500),
        senderName: "Alice",
        receiverName: "Bob",
      });
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(undefined),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.transaction as any) = vi.fn(async (callback) => {
        return callback({ insert: insertMock });
      });

      await repository.save(transactionData);

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.id).toBe(transactionData.id);
      expect(callArgs.senderAccountId).toBe(transactionData.senderAccountId);
      expect(callArgs.receiverAccountId).toBe(transactionData.receiverAccountId);
      expect(callArgs.senderName).toBe("Alice");
      expect(callArgs.receiverName).toBe("Bob");
    });

    it("should handle database errors gracefully", async () => {
      const transactionData = createMockTransaction();
      const dbMock = vi.mocked(dbClient.db);

      (dbMock.transaction as any) = vi.fn(async () => {
        throw new Error("Database connection failed");
      });

      await expect(repository.save(transactionData)).rejects.toThrow();
    });
  });

  describe("findById method", () => {
    it("should find transaction by id", async () => {
      const transactionData = createMockTransaction();
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(transactionData);
      const queryMock = {
        TransactionsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findById(transactionData.id);

      expect(findFirstMock).toHaveBeenCalled();
      expect(result).toEqual(transactionData);
    });

    it("should return null if transaction not found", async () => {
      const transactionId = `txn_123` as TTransactionId;
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(null);
      const queryMock = {
        TransactionsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findById(transactionId);

      expect(result).toBeNull();
    });
  });

  describe("findByUserId method", () => {
    it("should find transactions by user id", async () => {
      const userId = "user_123";
      const transactionData = createMockTransaction({ userId });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([transactionData]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByUserId(userId);

      expect(findManyMock).toHaveBeenCalled();
      expect(result).toEqual([transactionData]);
    });

    it("should return empty array if no transactions found", async () => {
      const userId = "user_123";
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByUserId(userId);

      expect(result).toEqual([]);
    });
  });

  describe("failedTransactions method", () => {
    it("should find failed transactions by user id", async () => {
      const userId = "user_123";
      const transactionData = createMockTransaction({ userId, status: "failed" });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([transactionData]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.failedTransactions({ userId });

      expect(findManyMock).toHaveBeenCalled();
      expect(result).toEqual([transactionData]);
    });

    it("should return empty array if no failed transactions found", async () => {
      const userId = "user_123";
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.failedTransactions({ userId });

      expect(result).toEqual([]);
    });

    it("should support filtering by account id", async () => {
      const userId = "user_123";
      const accountId = "acc_123" as TAccountId;
      const transactionData = createMockTransaction({
        userId,
        status: "failed",
        senderAccountId: accountId,
      });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([transactionData]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.failedTransactions({ userId, accountId });

      expect(findManyMock).toHaveBeenCalled();
      expect(result).toEqual([transactionData]);
    });

    it("should support filtering by date range", async () => {
      const userId = "user_123";
      const from = new Date("2024-01-01");
      const to = new Date("2024-12-31");
      const transactionData = createMockTransaction({
        userId,
        status: "failed",
        createdAt: new Date("2024-06-15"),
      });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([transactionData]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.failedTransactions({
        userId,
        dateRange: { from, to },
      });

      expect(findManyMock).toHaveBeenCalled();
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
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([transactionData]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.successfulTransactions({ userId });

      expect(findManyMock).toHaveBeenCalled();
      expect(result).toEqual([transactionData]);
    });

    it("should return empty array if no successful transactions found", async () => {
      const userId = "user_123";
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.successfulTransactions({ userId });

      expect(result).toEqual([]);
    });

    it("should support filtering by account id", async () => {
      const userId = "user_123";
      const accountId = "acc_123" as TAccountId;
      const transactionData = createMockTransaction({
        userId,
        status: "success",
        receiverAccountId: accountId,
      });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([transactionData]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.successfulTransactions({
        userId,
        accountId,
      });

      expect(findManyMock).toHaveBeenCalled();
      expect(result).toEqual([transactionData]);
    });

    it("should support filtering by date range", async () => {
      const userId = "user_123";
      const from = new Date("2024-01-01");
      const to = new Date("2024-12-31");
      const transactionData = createMockTransaction({
        userId,
        status: "success",
        createdAt: new Date("2024-06-15"),
      });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([transactionData]);
      const queryMock = {
        TransactionsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.successfulTransactions({
        userId,
        dateRange: { from, to },
      });

      expect(findManyMock).toHaveBeenCalled();
      expect(result).toEqual([transactionData]);
    });
  });

  describe("Repository instantiation", () => {
    it("should create a new instance successfully", () => {
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(TransactionRepository);
    });

    it("should have all required methods", () => {
      expect(typeof repository.save).toBe("function");
      expect(typeof repository.findById).toBe("function");
      expect(typeof repository.findByUserId).toBe("function");
      expect(typeof repository.failedTransactions).toBe("function");
      expect(typeof repository.successfulTransactions).toBe("function");
    });
  });

  describe("Database operations", () => {
    it("should call database insert with correct values", async () => {
      const transactionData = createMockTransaction({
        amount: BigInt(7500),
        senderName: "John",
        receiverName: "Jane",
      });
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(undefined),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.transaction as any) = vi.fn(async (callback) => {
        return callback({ insert: insertMock });
      });

      await repository.save(transactionData);

      expect(insertMock).toHaveBeenCalled();
      expect(valuesMock).toHaveBeenCalled();

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs).toHaveProperty("id");
      expect(callArgs).toHaveProperty("amount");
      expect(callArgs).toHaveProperty("senderAccountId");
      expect(callArgs).toHaveProperty("receiverAccountId");
      expect(callArgs).toHaveProperty("senderName");
      expect(callArgs).toHaveProperty("receiverName");
      expect(callArgs).toHaveProperty("status");
      expect(callArgs).toHaveProperty("createdAt");
    });
  });
});
