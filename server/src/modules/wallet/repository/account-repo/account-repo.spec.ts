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
  let mockCache: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; del: ReturnType<typeof vi.fn>; getOrSet: ReturnType<typeof vi.fn> };

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
    
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      getOrSet: vi.fn(),
    };
    
    repository = new AccountRepository(mockDb, mockCache);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("create method", () => {
    it("should invalidate user accounts cache on creation", async () => {
        const accountData = createMockAccount();
        const returningMock = vi.fn().mockResolvedValue([accountData]);
        const valuesMock = vi.fn().mockReturnValue({ returning: returningMock });
        (mockDb.insert as any).mockReturnValue({ values: valuesMock });

        await repository.create({
            id: accountData.id,
            name: accountData.name,
            userId: accountData.userId,
            accountNumber: accountData.accountNumber,
            balance: accountData.balance,
        });

        expect(mockCache.del).toHaveBeenCalledWith(`user-accounts:${accountData.userId}`);
    });
  });

  describe("findById method", () => {
    it("should fetch from DB and set to cache on cache miss", async () => {
        const accountData = createMockAccount();
        (mockCache.getOrSet as any).mockImplementation(async (key: any, fn: any) => {
            const result = await fn();
            return result;
        });
        (mockDb.query.AccountsTable.findFirst as any).mockResolvedValue(accountData);

        const result = await repository.findById(accountData.id);

        expect(result).toEqual(accountData);
        expect(mockCache.getOrSet).toHaveBeenCalledWith(`account:${accountData.id}`, expect.any(Function), 3600);
        expect(mockDb.query.AccountsTable.findFirst).toHaveBeenCalled();
    });
  });

  describe("adjustBalance method", () => {
    it("should invalidate caches on balance adjustment", async () => {
        const accountData = createMockAccount({ balance: 5000 });
        const selectExecuteMock = vi.fn().mockResolvedValue([accountData]);
        const selectForMock = vi.fn().mockReturnValue({ execute: selectExecuteMock });
        const selectWhereMock = vi.fn().mockReturnValue({ for: selectForMock });
        const selectFromMock = vi.fn().mockReturnValue({ where: selectWhereMock });
        (mockDb.select as any).mockReturnValue({ from: selectFromMock });
        const updateExecuteMock = vi.fn().mockResolvedValue(undefined);
        const updateWhereMock = vi.fn().mockReturnValue({ execute: updateExecuteMock });
        const setMock = vi.fn().mockReturnValue({ where: updateWhereMock });
        (mockDb.update as any).mockReturnValue({ set: setMock });
        (mockCache.getOrSet as any).mockImplementation(async (key: any, fn: any) => {
            const result = await fn();
            return result;
        });
        (mockDb.query.AccountsTable.findFirst as any).mockResolvedValue(accountData);

        await repository.adjustBalance(accountData.id, -500);

        expect(mockCache.del).toHaveBeenCalledWith(`account:${accountData.id}`);
        expect(mockCache.del).toHaveBeenCalledWith(`user-accounts:${accountData.userId}`);
    });
  });

  describe("updateBalance method", () => {
    it("should invalidate caches on balance update", async () => {
        const accountData = createMockAccount();
        const executeMock = vi.fn().mockResolvedValue(undefined);
        const whereMock = vi.fn().mockReturnValue({ execute: executeMock });
        const setMock = vi.fn().mockReturnValue({ where: whereMock });
        (mockDb.update as any).mockReturnValue({ set: setMock });
        (mockCache.getOrSet as any).mockImplementation(async (key: any, fn: any) => {
            const result = await fn();
            return result;
        });
        (mockDb.query.AccountsTable.findFirst as any).mockResolvedValue(accountData);

        await repository.updateBalance(accountData.id, 6000);

        expect(mockCache.del).toHaveBeenCalledWith(`account:${accountData.id}`);
        expect(mockCache.del).toHaveBeenCalledWith(`user-accounts:${accountData.userId}`);
    });
  });
});
