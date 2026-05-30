import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { IAccount } from "./account-service.interface";

const { createMock, findByIdMock, findByUserIdMock, checkBalanceMock, calculateNewBalanceMock, adjustBalanceMock, updateBalanceMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  findByIdMock: vi.fn(),
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

vi.mock("../../repository", () => ({
  AccountRepository: function AccountRepositoryMock(this: {
    create: typeof createMock;
    findById: typeof findByIdMock;
    findByUserId: typeof findByUserIdMock;
    checkBalance: typeof checkBalanceMock;
    calculateNewBalance: typeof calculateNewBalanceMock;
    adjustBalance: typeof adjustBalanceMock;
    updateBalance: typeof updateBalanceMock;
  }) {
    this.create = createMock;
    this.findById = findByIdMock;
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

  const mockAccount: IAccount = {
    id: "account_123" as any,
    name: "Savings Account",
    userId: "user_123" as any,
    accountNumber: "1234567890",
    balance: 5000,
    createdAt: new Date("2024-01-01"),
    updatedAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    accountService = new AccountService();
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

  describe("getAccountById", () => {
    it("should retrieve account by ID", async () => {
      findByIdMock.mockResolvedValue(mockAccount);

      const result = await accountService.getAccountById("account_123" as any);

      expect(result).toEqual(mockAccount);
      expect(findByIdMock).toHaveBeenCalledWith("account_123");
    });

    it("should return null if account not found", async () => {
      findByIdMock.mockResolvedValue(null);

      const result = await accountService.getAccountById("account_999" as any);

      expect(result).toBeNull();
    });

    it("should throw error if retrieval fails", async () => {
      findByIdMock.mockRejectedValue(new Error("Database error"));

      await expect(
        accountService.getAccountById("account_123" as any)
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
      findByIdMock.mockResolvedValue({ ...mockAccount, balance: 5500 });

      const result = await accountService.updateAccountBalance("account_123" as any, 500);

      expect(result.balance).toBe(5500);
      expect(adjustBalanceMock).toHaveBeenCalledWith("account_123", 500);
    });

    it("should deduct amount from balance", async () => {
      adjustBalanceMock.mockResolvedValue(4500);
      findByIdMock.mockResolvedValue({ ...mockAccount, balance: 4500 });

      const result = await accountService.updateAccountBalance("account_123" as any, -500);

      expect(result.balance).toBe(4500);
      expect(adjustBalanceMock).toHaveBeenCalledWith("account_123", -500);
    });

    it("should throw error if balance calculation fails", async () => {
      adjustBalanceMock.mockRejectedValue(new Error("Insufficient funds"));

      await expect(
        accountService.updateAccountBalance("account_123" as any, 10000)
      ).rejects.toThrow();
    });

    it("should throw error if balance update fails", async () => {
      adjustBalanceMock.mockRejectedValue(new Error("Database error"));

      await expect(
        accountService.updateAccountBalance("account_123" as any, 500)
      ).rejects.toThrow();
    });

    it("should throw error if account not found after update", async () => {
      adjustBalanceMock.mockResolvedValue(5500);
      findByIdMock.mockResolvedValue(null);

      await expect(
        accountService.updateAccountBalance("account_123" as any, 500)
      ).rejects.toThrow();
    });
  });
});
