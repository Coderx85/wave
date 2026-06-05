import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { IAccount } from "./account-service.interface";
import type { IAccountRepository } from "../../../repository";

const { createMock, findByIdMock, findByAccountNumberMock, findByUserIdMock, checkBalanceMock, calculateNewBalanceMock, adjustBalanceMock, updateBalanceMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findByIdMock: vi.fn(),
  findByAccountNumberMock: vi.fn(),
  findByUserIdMock: vi.fn(),
  checkBalanceMock: vi.fn(),
  calculateNewBalanceMock: vi.fn(),
  adjustBalanceMock: vi.fn(),
  updateBalanceMock: vi.fn(),
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

vi.mock("../../../repository", () => ({
  AccountRepository: function AccountRepositoryMock(this: {
    create: typeof createMock;
    findById: typeof findByIdMock;
    findByAccountNumber: typeof findByAccountNumberMock;
    findByUserId: typeof findByUserIdMock;
    checkBalance: typeof checkBalanceMock;
    calculateNewBalance: typeof calculateNewBalanceMock;
    adjustBalance: typeof adjustBalanceMock;
    updateBalance: typeof updateBalanceMock;
  }) {
    this.create = createMock;
    this.findById = findByIdMock;
    this.findByAccountNumber = findByAccountNumberMock;
    this.findByUserId = findByUserIdMock;
    this.checkBalance = checkBalanceMock;
    this.calculateNewBalance = calculateNewBalanceMock;
    this.adjustBalance = adjustBalanceMock;
    this.updateBalance = updateBalanceMock;
  },
}));

import { AccountService } from "../account-service";

describe("AccountService", () => {
  let accountService: AccountService;

  const mockAccount = {
    name: "Savings Account",
    userId: "user_123" as any,
    accountNumber: "1234567890",
    balance: 5000,
    createdAt: new Date("2024-01-01"),
    updatedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    accountService = new AccountService({
      create: createMock,
      findById: findByIdMock,
      findByAccountNumber: findByAccountNumberMock,
      findByUserId: findByUserIdMock,
      checkBalance: checkBalanceMock,
      calculateNewBalance: calculateNewBalanceMock,
      adjustBalance: adjustBalanceMock,
      updateBalance: updateBalanceMock,
    } as unknown as IAccountRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("should create a new account", async () => {
      createMock.mockResolvedValue(mockAccount);

      const result = await accountService.create({
        name: "Savings Account",
        userId: "user_123" as any,
        accountNumber: "1234567890",
        balance: 5000,
      });

      expect(result).toEqual(mockAccount);
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    it("should pass correct parameters to repository", async () => {
      createMock.mockResolvedValue(mockAccount);

      await accountService.create({
        name: "Savings Account",
        userId: "user_123" as any,
        accountNumber: "1234567890",
        balance: 5000,
      });

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Savings Account",
          userId: "user_123",
          accountNumber: "1234567890",
          balance: 5000,
        })
      );
    });

    it("should throw error if account creation fails", async () => {
      createMock.mockRejectedValue(new Error("Database error"));

      await expect(
        accountService.create({
          name: "Savings Account",
          userId: "user_123" as any,
          accountNumber: "1234567890",
          balance: 5000,
        })
      ).rejects.toThrow();
    });
  });

  describe("getAccountByNumber", () => {
    it("should retrieve account by account number", async () => {
      findByAccountNumberMock.mockResolvedValue(mockAccount);

      const result = await accountService.getAccountByNumber("1234567890");

      expect(result).toEqual(mockAccount);
      expect(findByAccountNumberMock).toHaveBeenCalledWith("1234567890");
    });

    it("should return null if account not found", async () => {
      findByAccountNumberMock.mockResolvedValue(null);

      const result = await accountService.getAccountByNumber("0000000000");

      expect(result).toBeNull();
    });

    it("should throw error if retrieval fails", async () => {
      findByAccountNumberMock.mockRejectedValue(new Error("Database error"));

      await expect(
        accountService.getAccountByNumber("1234567890")
      ).rejects.toThrow();
    });
  });

  describe("getUserAccounts", () => {
    it("should retrieve all user accounts", async () => {
      const mockAccounts = [mockAccount];
      findByUserIdMock.mockResolvedValue(mockAccounts);

      const result = await accountService.getUserAccounts("user_123" as any);

      expect(result).toEqual(mockAccounts);
      expect(findByUserIdMock).toHaveBeenCalledWith("user_123");
    });

    it("should return empty array if user has no accounts", async () => {
      findByUserIdMock.mockResolvedValue([]);

      const result = await accountService.getUserAccounts("user_999" as any);

      expect(result).toEqual([]);
    });

    it("should handle multiple accounts", async () => {
      const mockAccounts = [
        mockAccount,
        {
          ...mockAccount,
          id: "account_456" as any,
          name: "Checking Account",
        },
      ];
      findByUserIdMock.mockResolvedValue(mockAccounts);

      const result = await accountService.getUserAccounts("user_123" as any);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Savings Account");
      expect(result[1].name).toBe("Checking Account");
    });

    it("should throw error if retrieval fails", async () => {
      findByUserIdMock.mockRejectedValue(new Error("Database error"));

      await expect(
        accountService.getUserAccounts("user_123" as any)
      ).rejects.toThrow();
    });
  });

  describe("getBalance", () => {
    it("should retrieve account balance", async () => {
      checkBalanceMock.mockResolvedValue(mockAccount);

      const result = await accountService.getBalance("account_123" as any);

      expect(result).toBe(5000);
      expect(checkBalanceMock).toHaveBeenCalledWith("account_123");
    });

    it("should return correct balance for different accounts", async () => {
      const accountWithBalance1000 = { ...mockAccount, balance: 1000 };
      checkBalanceMock.mockResolvedValue(accountWithBalance1000);

      const result = await accountService.getBalance("account_999" as any);

      expect(result).toBe(1000);
    });

    it("should throw error if balance retrieval fails", async () => {
      checkBalanceMock.mockRejectedValue(new Error("Account not found"));

      await expect(
        accountService.getBalance("account_123" as any)
      ).rejects.toThrow();
    });
  });

  describe("updateAccountBalance", () => {
    it("should calculate and update account balance", async () => {
      adjustBalanceMock.mockResolvedValue(5500);
      findByAccountNumberMock.mockResolvedValue({ ...mockAccount, balance: 5500 });

      const result = await accountService.updateAccountBalance("1234567890", 500);

      expect(result.balance).toBe(5500);
      expect(adjustBalanceMock).toHaveBeenCalledWith("1234567890", 500);
    });

    it("should deduct amount from balance", async () => {
      adjustBalanceMock.mockResolvedValue(4500);
      findByAccountNumberMock.mockResolvedValue({ ...mockAccount, balance: 4500 });

      const result = await accountService.updateAccountBalance("1234567890", -500);

      expect(result.balance).toBe(4500);
      expect(adjustBalanceMock).toHaveBeenCalledWith("1234567890", -500);
    });

    it("should throw error if balance calculation fails", async () => {
      adjustBalanceMock.mockRejectedValue(new Error("Insufficient funds"));

      await expect(
        accountService.updateAccountBalance("1234567890", 10000)
      ).rejects.toThrow();
    });

    it("should throw error if balance update fails", async () => {
      adjustBalanceMock.mockRejectedValue(new Error("Database error"));

      await expect(
        accountService.updateAccountBalance("1234567890", 500)
      ).rejects.toThrow();
    });

    it("should throw error if account not found after update", async () => {
      adjustBalanceMock.mockResolvedValue(5500);
      findByAccountNumberMock.mockResolvedValue(null);

      await expect(
        accountService.updateAccountBalance("1234567890", 500)
      ).rejects.toThrow();
    });
  });
});
