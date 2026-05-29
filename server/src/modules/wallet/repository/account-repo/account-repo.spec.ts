import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { IAccountDBDTO } from "./account-repo.interface";
import type { TBankAccountId, TUserId } from "../../../../types";

// Mock the database client and drizzle-orm BEFORE importing AccountRepo
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
import { AccountRepository } from "./account-repo";
import * as dbClient from "../../../database/client";

describe("AccountRepository", () => {
  let repository: AccountRepository;

  const createMockAccount = (
    overrides?: Partial<IAccountDBDTO>
  ): IAccountDBDTO => ({
    id: `acc_${Math.random()}` as TBankAccountId,
    name: "Checking Account",
    userId: "user_123" as TUserId,
    accountNumber: "1234567890",
    balance: 5000,
    createdAt: new Date(),
    updatedAt: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new AccountRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create method", () => {
    it("should create a new account", async () => {
      const accountData = createMockAccount();
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([accountData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      const result = await repository.create({
        id: accountData.id,
        name: accountData.name,
        userId: accountData.userId,
        accountNumber: accountData.accountNumber,
        balance: accountData.balance,
      });

      expect(insertMock).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.balance).toBe(accountData.balance);
    });

    it("should convert balance to string when creating", async () => {
      const accountData = createMockAccount({ balance: 7500 });
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([accountData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      await repository.create({
        id: accountData.id,
        name: accountData.name,
        userId: accountData.userId,
        accountNumber: accountData.accountNumber,
        balance: accountData.balance,
      });

      const callArgs = valuesMock.mock.calls[0][0];
      expect(typeof callArgs.balance).toBe("string");
      expect(callArgs.balance).toBe("7500");
    });

    it("should set createdAt timestamp when creating", async () => {
      const accountData = createMockAccount();
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([accountData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      await repository.create({
        id: accountData.id,
        name: accountData.name,
        userId: accountData.userId,
        accountNumber: accountData.accountNumber,
        balance: accountData.balance,
      });

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.createdAt).toBeDefined();
      expect(callArgs.createdAt instanceof Date).toBe(true);
    });

    it("should set updatedAt to null when creating", async () => {
      const accountData = createMockAccount();
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([accountData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      await repository.create({
        id: accountData.id,
        name: accountData.name,
        userId: accountData.userId,
        accountNumber: accountData.accountNumber,
        balance: accountData.balance,
      });

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.updatedAt).toBeNull();
    });

    it("should convert returned balance from string to number", async () => {
      const mockAccountResponse = {
        ...createMockAccount({ balance: 3000 }),
        balance: "3000",
      };
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockAccountResponse]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      const result = await repository.create({
        id: mockAccountResponse.id,
        name: mockAccountResponse.name,
        userId: mockAccountResponse.userId,
        accountNumber: mockAccountResponse.accountNumber,
        balance: 3000,
      });

      expect(typeof result.balance).toBe("number");
      expect(result.balance).toBe(3000);
    });

    it("should preserve account fields when creating", async () => {
      const accountData = createMockAccount({
        name: "Savings Account",
        accountNumber: "9876543210",
      });
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([accountData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      await repository.create({
        id: accountData.id,
        name: accountData.name,
        userId: accountData.userId,
        accountNumber: accountData.accountNumber,
        balance: accountData.balance,
      });

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.id).toBe(accountData.id);
      expect(callArgs.name).toBe("Savings Account");
      expect(callArgs.userId).toBe(accountData.userId);
      expect(callArgs.accountNumber).toBe("9876543210");
    });

    it("should throw error if account creation fails", async () => {
      const accountData = createMockAccount();
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
          id: accountData.id,
          name: accountData.name,
          userId: accountData.userId,
          accountNumber: accountData.accountNumber,
          balance: accountData.balance,
        })
      ).rejects.toThrow();
    });

    it("should handle database errors gracefully", async () => {
      const accountData = createMockAccount();
      const dbMock = vi.mocked(dbClient.db);

      (dbMock.insert as any) = vi.fn(() => {
        throw new Error("Database connection failed");
      });

      await expect(
        repository.create({
          id: accountData.id,
          name: accountData.name,
          userId: accountData.userId,
          accountNumber: accountData.accountNumber,
          balance: accountData.balance,
        })
      ).rejects.toThrow();
    });
  });

  describe("findById method", () => {
    it("should find account by id", async () => {
      const accountData = createMockAccount();
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(accountData);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findById(accountData.id);

      expect(findFirstMock).toHaveBeenCalled();
      expect(result).toEqual(accountData);
    });

    it("should return null if account not found", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(null);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findById(accountId);

      expect(result).toBeNull();
    });

    it("should convert balance from string to number on retrieval", async () => {
      const mockAccountResponse = {
        ...createMockAccount({ balance: 4500 }),
        balance: "4500",
      };
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(mockAccountResponse);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findById(mockAccountResponse.id);

      expect(typeof result?.balance).toBe("number");
      expect(result?.balance).toBe(4500);
    });
  });

  describe("findByUserId method", () => {
    it("should find accounts by user id", async () => {
      const userId = "user_123" as TUserId;
      const accountData = createMockAccount({ userId });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([accountData]);
      const queryMock = {
        AccountsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByUserId(userId);

      expect(findManyMock).toHaveBeenCalled();
      expect(result).toEqual([accountData]);
    });

    it("should return empty array if no accounts found", async () => {
      const userId = "user_123" as TUserId;
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([]);
      const queryMock = {
        AccountsTable: {
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

    it("should convert balance from string to number for all accounts", async () => {
      const userId = "user_123" as TUserId;
      const mockAccountsResponse = [
        { ...createMockAccount({ userId, balance: 1000 }), balance: "1000" },
        { ...createMockAccount({ userId, balance: 2000 }), balance: "2000" },
      ];
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue(mockAccountsResponse);
      const queryMock = {
        AccountsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByUserId(userId);

      expect(result).toHaveLength(2);
      expect(typeof result[0].balance).toBe("number");
      expect(typeof result[1].balance).toBe("number");
      expect(result[0].balance).toBe(1000);
      expect(result[1].balance).toBe(2000);
    });

    it("should return multiple accounts for same user", async () => {
      const userId = "user_123" as TUserId;
      const account1 = createMockAccount({ userId, name: "Checking" });
      const account2 = createMockAccount({ userId, name: "Savings" });
      const dbMock = vi.mocked(dbClient.db);

      const findManyMock = vi.fn().mockResolvedValue([account1, account2]);
      const queryMock = {
        AccountsTable: {
          findMany: findManyMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.findByUserId(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Checking");
      expect(result[1].name).toBe("Savings");
    });
  });

  describe("calculateNewBalance method", () => {
    it("should calculate new balance correctly", async () => {
      const accountData = createMockAccount({ balance: 5000 });
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(accountData);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        }),
      });

      (dbMock.select as any) = selectMock;

      const result = await repository.calculateNewBalance(accountData.id, 1000);

      expect(result).toBe(6000);
    });

    it("should handle negative amounts correctly", async () => {
      const accountData = createMockAccount({ balance: 5000 });
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(accountData);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        }),
      });

      (dbMock.select as any) = selectMock;

      const result = await repository.calculateNewBalance(accountData.id, -2000);

      expect(result).toBe(3000);
    });

    it("should throw error if account not found", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(null);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      await expect(repository.calculateNewBalance(accountId, 1000)).rejects.toThrow();
    });

    it("should throw error if new balance is insufficient", async () => {
      const accountData = createMockAccount({ balance: 500 });
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(accountData);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        }),
      });

      (dbMock.select as any) = selectMock;

      await expect(
        repository.calculateNewBalance(accountData.id, -1000)
      ).rejects.toThrow("Insufficient funds");
    });

    it("should throw error if new balance equals zero", async () => {
      const accountData = createMockAccount({ balance: 1000 });
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(accountData);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        }),
      });

      (dbMock.select as any) = selectMock;

      await expect(
        repository.calculateNewBalance(accountData.id, -1000)
      ).rejects.toThrow("Insufficient funds");
    });

    it("should lock the account row for update", async () => {
      const accountData = createMockAccount({ balance: 5000 });
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(accountData);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const selectMock = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          for: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              execute: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        }),
      });

      (dbMock.select as any) = selectMock;

      await repository.calculateNewBalance(accountData.id, 1000);

      expect(selectMock).toHaveBeenCalled();
    });
  });

  describe("checkBalance method", () => {
    it("should check account balance", async () => {
      const accountData = createMockAccount({ balance: 5000 });
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(accountData);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.checkBalance(accountData.id);

      expect(findFirstMock).toHaveBeenCalled();
      expect(result).toEqual(accountData);
    });

    it("should throw error if account not found", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(null);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      await expect(repository.checkBalance(accountId)).rejects.toThrow();
    });

    it("should return account with correct balance", async () => {
      const accountData = createMockAccount({
        balance: 9999,
        name: "Premium Account",
      });
      const dbMock = vi.mocked(dbClient.db);

      const findFirstMock = vi.fn().mockResolvedValue(accountData);
      const queryMock = {
        AccountsTable: {
          findFirst: findFirstMock,
        },
      };

      Object.defineProperty(dbMock, "query", {
        value: queryMock,
        configurable: true,
      });

      const result = await repository.checkBalance(accountData.id);

      expect(result.balance).toBe(9999);
      expect(result.name).toBe("Premium Account");
    });
  });

  describe("updateBalance method", () => {
    it("should update account balance", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const newBalance = 8500;
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

      await repository.updateBalance(accountId, newBalance);

      expect(updateMock).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });

    it("should convert balance to string when updating", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const newBalance = 6250;
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

      await repository.updateBalance(accountId, newBalance);

      const callArgs = setMock.mock.calls[0][0];
      expect(typeof callArgs.balance).toBe("string");
      expect(callArgs.balance).toBe("6250");
    });

    it("should set updatedAt timestamp when updating balance", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const newBalance = 3500;
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

      await repository.updateBalance(accountId, newBalance);

      const callArgs = setMock.mock.calls[0][0];
      expect(callArgs.updatedAt).toBeDefined();
      expect(callArgs.updatedAt instanceof Date).toBe(true);
    });

    it("should handle zero balance update", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const newBalance = 0;
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

      await repository.updateBalance(accountId, newBalance);

      const callArgs = setMock.mock.calls[0][0];
      expect(callArgs.balance).toBe("0");
    });

    it("should handle large balance values", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const newBalance = 999999999.99;
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

      await repository.updateBalance(accountId, newBalance);

      const callArgs = setMock.mock.calls[0][0];
      expect(callArgs.balance).toBe("999999999.99");
    });

    it("should handle database errors gracefully", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const newBalance = 5000;
      const dbMock = vi.mocked(dbClient.db);

      (dbMock.update as any) = vi.fn(() => {
        throw new Error("Database connection failed");
      });

      await expect(
        repository.updateBalance(accountId, newBalance)
      ).rejects.toThrow();
    });
  });

  describe("Repository instantiation", () => {
    it("should create a new instance successfully", () => {
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(AccountRepository);
    });

    it("should have all required methods", () => {
      expect(typeof repository.create).toBe("function");
      expect(typeof repository.findById).toBe("function");
      expect(typeof repository.findByUserId).toBe("function");
      expect(typeof repository.calculateNewBalance).toBe("function");
      expect(typeof repository.checkBalance).toBe("function");
      expect(typeof repository.updateBalance).toBe("function");
    });
  });

  describe("Database operations", () => {
    it("should call database insert with correct account values", async () => {
      const accountData = createMockAccount({
        name: "Business Account",
        accountNumber: "1111111111",
        balance: 50000,
      });
      const dbMock = vi.mocked(dbClient.db);

      const valuesMock = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([accountData]),
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      (dbMock.insert as any) = insertMock;

      await repository.create({
        id: accountData.id,
        name: accountData.name,
        userId: accountData.userId,
        accountNumber: accountData.accountNumber,
        balance: accountData.balance,
      });

      expect(insertMock).toHaveBeenCalled();
      expect(valuesMock).toHaveBeenCalled();

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs).toHaveProperty("id");
      expect(callArgs).toHaveProperty("name");
      expect(callArgs).toHaveProperty("userId");
      expect(callArgs).toHaveProperty("accountNumber");
      expect(callArgs).toHaveProperty("balance");
      expect(callArgs).toHaveProperty("createdAt");
      expect(callArgs).toHaveProperty("updatedAt");
    });
  });
});
