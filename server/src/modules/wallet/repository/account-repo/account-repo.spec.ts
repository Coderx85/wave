import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { IAccountDBDTO } from "./account-repo.interface";
import type { TBankAccountId, TUserId } from "../../../../types";
import { AccountRepository } from "./account-repo";
import type { DrizzleDb } from "@/lib/repository/base-repository";
import { eq } from "drizzle-orm";

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    eq: vi.fn(),
    sql: vi.fn((...args) => args[0]),
    defineRelations: vi.fn(),
    relations: vi.fn(),
  };
});

describe("AccountRepository", () => {
  let repository: AccountRepository;
  let mockDb: DrizzleDb;

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
    mockDb = {
      insert: vi.fn(),
      query: {
        AccountsTable: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      select: vi.fn(),
      update: vi.fn(),
      transaction: vi.fn().mockImplementation(async (cb) => cb(mockDb)),
    } as unknown as DrizzleDb;
    repository = new AccountRepository(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create method", () => {
    it("should create a new account", async () => {
      const accountData = createMockAccount();

      const returningMock = vi.fn().mockResolvedValue([accountData]);
      const valuesMock = vi.fn().mockReturnValue({
        returning: returningMock,
      });
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });

      const result = await repository.create({
        id: accountData.id,
        name: accountData.name,
        userId: accountData.userId,
        accountNumber: accountData.accountNumber,
        balance: accountData.balance,
      });

      expect(mockDb.insert).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.balance).toBe(accountData.balance);
    });

    it("should convert balance to string when creating", async () => {
      const accountData = createMockAccount({ balance: 7500 });
      const returningMock = vi.fn().mockResolvedValue([accountData]);
      const valuesMock = vi.fn().mockReturnValue({
        returning: returningMock,
      });
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });

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
      const returningMock = vi.fn().mockResolvedValue([accountData]);
      const valuesMock = vi.fn().mockReturnValue({
        returning: returningMock,
      });
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });

      await repository.create({
        id: accountData.id,
        name: accountData.name,
        userId: accountData.userId,
        accountNumber: accountData.accountNumber,
        balance: accountData.balance,
      });

      const callArgs = valuesMock.mock.calls[0][0];
      expect(callArgs.createdAt).toBeInstanceOf(Date);
    });

    it("should set updatedAt to null when creating", async () => {
      const accountData = createMockAccount();
      const returningMock = vi.fn().mockResolvedValue([accountData]);
      const valuesMock = vi.fn().mockReturnValue({
        returning: returningMock,
      });
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });

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
      const returningMock = vi.fn().mockResolvedValue([mockAccountResponse]);
      const valuesMock = vi.fn().mockReturnValue({
        returning: returningMock,
      });
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });

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

    it("should throw error if account creation fails", async () => {
      const accountData = createMockAccount();
      const returningMock = vi.fn().mockResolvedValue([]);
      const valuesMock = vi.fn().mockReturnValue({
        returning: returningMock,
      });
      (mockDb.insert as any).mockReturnValue({ values: valuesMock });

      await expect(
        repository.create({
          id: accountData.id,
          name: accountData.name,
          userId: accountData.userId,
          accountNumber: accountData.accountNumber,
          balance: accountData.balance,
        })
      ).rejects.toThrow("Failed to create account");
    });
  });

  describe("findById method", () => {
    it("should find account by id", async () => {
      const accountData = createMockAccount();
      (mockDb.query.AccountsTable.findFirst as any).mockResolvedValue(accountData);

      const result = await repository.findById(accountData.id);

      expect(mockDb.query.AccountsTable.findFirst).toHaveBeenCalled();
      expect(result).toEqual(accountData);
    });

    it("should return null if account not found", async () => {
      const accountId = "acc_123" as TBankAccountId;
      (mockDb.query.AccountsTable.findFirst as any).mockResolvedValue(null);

      const result = await repository.findById(accountId);

      expect(result).toBeNull();
    });

    it("should convert balance from string to number on retrieval", async () => {
      const mockAccountResponse = {
        ...createMockAccount({ balance: 4500 }),
        balance: "4500",
      };
      (mockDb.query.AccountsTable.findFirst as any).mockResolvedValue(mockAccountResponse);

      const result = await repository.findById(mockAccountResponse.id);

      expect(typeof result?.balance).toBe("number");
      expect(result?.balance).toBe(4500);
    });
  });

  describe("findByUserId method", () => {
    it("should find accounts by user id", async () => {
      const userId = "user_123" as TUserId;
      const accountData = createMockAccount({ userId });
      (mockDb.query.AccountsTable.findMany as any).mockResolvedValue([accountData]);

      const result = await repository.findByUserId(userId);

      expect(mockDb.query.AccountsTable.findMany).toHaveBeenCalled();
      expect(result).toEqual([accountData]);
    });

    it("should return empty array if no accounts found", async () => {
      const userId = "user_123" as TUserId;
      (mockDb.query.AccountsTable.findMany as any).mockResolvedValue([]);

      const result = await repository.findByUserId(userId);

      expect(result).toEqual([]);
    });

    it("should convert balance from string to number for all accounts", async () => {
      const userId = "user_123" as TUserId;
      const mockAccountsResponse = [
        { ...createMockAccount({ userId, balance: 1000 }), balance: "1000" },
        { ...createMockAccount({ userId, balance: 2000 }), balance: "2000" },
      ];
      (mockDb.query.AccountsTable.findMany as any).mockResolvedValue(mockAccountsResponse);

      const result = await repository.findByUserId(userId);

      expect(result).toHaveLength(2);
      expect(typeof result[0].balance).toBe("number");
      expect(typeof result[1].balance).toBe("number");
      expect(result[0].balance).toBe(1000);
      expect(result[1].balance).toBe(2000);
    });
  });

  describe("calculateNewBalance method", () => {
    it("should calculate new balance correctly", async () => {
      const accountData = createMockAccount({ balance: 5000 });
      const executeMock = vi.fn().mockResolvedValue([accountData]);
      const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
      const forMock = vi.fn().mockReturnValue({ where: whereMock });
      const fromMock = vi.fn().mockReturnValue({ for: forMock });
      (mockDb.select as any).mockReturnValue({ from: fromMock });

      const result = await repository.calculateNewBalance(accountData.id, 1000);

      expect(result).toBe(6000);
    });

    it("should throw error if account not found", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const executeMock = vi.fn().mockResolvedValue([]);
      const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
      const forMock = vi.fn().mockReturnValue({ where: whereMock });
      const fromMock = vi.fn().mockReturnValue({ for: forMock });
      (mockDb.select as any).mockReturnValue({ from: fromMock });

      await expect(repository.calculateNewBalance(accountId, 1000)).rejects.toThrow("Account not found");
    });

    it("should throw error if new balance is insufficient", async () => {
      const accountData = createMockAccount({ balance: 500 });
      const executeMock = vi.fn().mockResolvedValue([accountData]);
      const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
      const forMock = vi.fn().mockReturnValue({ where: whereMock });
      const fromMock = vi.fn().mockReturnValue({ for: forMock });
      (mockDb.select as any).mockReturnValue({ from: fromMock });

      await expect(
        repository.calculateNewBalance(accountData.id, -1000)
      ).rejects.toThrow("Insufficient funds");
    });
  });

  describe("adjustBalance method", () => {
    it("should update the account balance atomically", async () => {
      const accountData = createMockAccount({ balance: 5000 });
      
      const selectExecuteMock = vi.fn().mockResolvedValue([accountData]);
      const selectWhereMock = vi.fn().mockReturnValue({ execute: selectExecuteMock });
      const selectForMock = vi.fn().mockReturnValue({ where: selectWhereMock });
      const selectFromMock = vi.fn().mockReturnValue({ for: selectForMock });
      (mockDb.select as any).mockReturnValue({ from: selectFromMock });

      const updateExecuteMock = vi.fn().mockResolvedValue(undefined);
      const updateWhereMock = vi.fn().mockReturnValue({ execute: updateExecuteMock });
      const setMock = vi.fn().mockReturnValue({ where: updateWhereMock });
      (mockDb.update as any).mockReturnValue({ set: setMock });

      const result = await repository.adjustBalance(accountData.id, -500);

      expect(result).toBe(4500);
      expect(mockDb.update).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({
        balance: "4500",
        updatedAt: expect.any(Date),
      });
    });

    it("should reject overdrafts", async () => {
      const accountData = createMockAccount({ balance: 500 });
      const executeMock = vi.fn().mockResolvedValue([accountData]);
      const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
      const forMock = vi.fn().mockReturnValue({ where: whereMock });
      const fromMock = vi.fn().mockReturnValue({ for: forMock });
      (mockDb.select as any).mockReturnValue({ from: fromMock });

      await expect(repository.adjustBalance(accountData.id, -1000)).rejects.toThrow("Insufficient funds");
    });
  });

  describe("checkBalance method", () => {
    it("should check account balance", async () => {
      const accountData = createMockAccount({ balance: 5000 });
      (mockDb.query.AccountsTable.findFirst as any).mockResolvedValue(accountData);

      const result = await repository.checkBalance(accountData.id);

      expect(mockDb.query.AccountsTable.findFirst).toHaveBeenCalled();
      expect(result).toEqual(accountData);
    });

    it("should throw error if account not found", async () => {
      const accountId = "acc_123" as TBankAccountId;
      (mockDb.query.AccountsTable.findFirst as any).mockResolvedValue(null);

      await expect(repository.checkBalance(accountId)).rejects.toThrow("Account not found");
    });
  });

  describe("updateBalance method", () => {
    it("should update account balance", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const newBalance = 8500;
      
      const executeMock = vi.fn().mockResolvedValue(undefined);
      const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
      const setMock = vi.fn().mockReturnValue({ where: whereMock });
      (mockDb.update as any).mockReturnValue({ set: setMock });

      await repository.updateBalance(accountId, newBalance);

      expect(mockDb.update).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({
        balance: "8500",
        updatedAt: expect.any(Date),
      });
      expect(whereMock).toHaveBeenCalledWith(eq(undefined, accountId));
    });

    it("should convert balance to string when updating", async () => {
      const accountId = "acc_123" as TBankAccountId;
      const newBalance = 6250;
      const executeMock = vi.fn().mockResolvedValue(undefined);
      const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
      const setMock = vi.fn().mockReturnValue({ where: whereMock });
      (mockDb.update as any).mockReturnValue({ set: setMock });

      await repository.updateBalance(accountId, newBalance);

      const callArgs = setMock.mock.calls[0][0];
      expect(typeof callArgs.balance).toBe("string");
      expect(callArgs.balance).toBe("6250");
    });
  });
});
