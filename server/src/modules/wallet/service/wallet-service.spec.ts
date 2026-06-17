import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("dns", () => ({
  lookup: vi.fn((_host: string, cb: any) => {
    if (typeof cb === "function") cb(null, "127.0.0.1");
  }),
}));
vi.mock("util", async (importOriginal) => {
  const orig = await importOriginal<typeof import("util")>();
  return {
    ...orig,
    promisify: (fn: any) => {
      return (...args: any[]) =>
        new Promise((resolve, reject) => {
          const callback = (...cbArgs: any[]) => {
            const err = cbArgs[0];
            if (err) reject(err);
            else resolve(cbArgs[1]);
          };
          fn(...args, callback);
        });
    },
  };
});
vi.mock("tigerbeetle-node", () => ({
  createClient: vi.fn(() => ({})),
}));

import { WalletService } from "./wallet-service";
import type {
  IAccount,
  ILedger,
} from "./internal";
import type { IAccountRepository, ITransactionRepository, ILedgerRepository } from "../repository";

type MockedRepo<T> = {
  [K in keyof T]: ReturnType<typeof vi.fn>;
};

function createMockAccountRepo(): MockedRepo<IAccountRepository> {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByAccountNumber: vi.fn(),
    findByUserId: vi.fn(),
    checkBalance: vi.fn(),
    calculateNewBalance: vi.fn(),
    adjustBalance: vi.fn(),
    updateBalance: vi.fn(),
  };
}

function createMockTransactionRepo(): MockedRepo<ITransactionRepository> {
  return {
    save: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    failedTransactions: vi.fn(),
    successfulTransactions: vi.fn(),
  };
}

function createMockLedgerRepo(): MockedRepo<ILedgerRepository> {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByTransactionId: vi.fn(),
    findByEntryType: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────

describe("WalletService (Deep Module)", () => {
  let service: WalletService;
  let accountRepo: ReturnType<typeof createMockAccountRepo>;
  let transactionRepo: ReturnType<typeof createMockTransactionRepo>;
  let ledgerRepo: ReturnType<typeof createMockLedgerRepo>;

  const mockAccount = {
    name: "Savings Account",
    userId: "user_123" as any,
    accountNumber: "1234567890",
    balance: 5000,
    createdAt: new Date("2024-01-01"),
    updatedAt: null,
  };

  beforeEach(() => {
    accountRepo = createMockAccountRepo();
    transactionRepo = createMockTransactionRepo();
    ledgerRepo = createMockLedgerRepo();
    // Mocks don't fully match the repository interfaces for TS — cast to satisfy the constructor
    service = new WalletService(
      accountRepo as unknown as IAccountRepository,
      transactionRepo as unknown as ITransactionRepository,
      ledgerRepo as unknown as ILedgerRepository,
    );
  });

  // ── Account Operations ───────────────────────────────────────────

  describe("createAccount", () => {
    it("should create a new account", async () => {
      accountRepo.create.mockResolvedValue(mockAccount);

      const result = await service.createAccount({
        name: "Savings Account",
        userId: "user_123" as any,
        accountNumber: "1234567890",
        balance: 5000,
      });

      expect(result).toEqual(mockAccount);
      expect(accountRepo.create).toHaveBeenCalledTimes(1);
      expect(accountRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Savings Account",
          userId: "user_123",
          accountNumber: "1234567890",
          balance: 5000,
        }),
      );
    });

    it("should throw when repository fails", async () => {
      accountRepo.create.mockRejectedValue(new Error("DB error"));

      await expect(
        service.createAccount({
          name: "Test",
          userId: "user_1" as any,
          accountNumber: "111",
          balance: 0,
        }),
      ).rejects.toThrow();
    });
  });

  describe("getAccountById", () => {
    it("should return account when found", async () => {
      accountRepo.findByAccountNumber.mockResolvedValue(mockAccount);

      const result = await service.getAccountById("1234567890");

      expect(result).toEqual(mockAccount);
      expect(accountRepo.findByAccountNumber).toHaveBeenCalledWith("1234567890");
    });

    it("should return null when not found", async () => {
      accountRepo.findByAccountNumber.mockResolvedValue(null);

      const result = await service.getAccountById("0000000000");

      expect(result).toBeNull();
    });
  });

  describe("getAccountByAccountNumber", () => {
    it("should return account when found", async () => {
      accountRepo.findByAccountNumber.mockResolvedValue(mockAccount);

      const result = await service.getAccountByAccountNumber("1234567890");

      expect(result).toEqual(mockAccount);
      expect(accountRepo.findByAccountNumber).toHaveBeenCalledWith("1234567890");
    });

    it("should return null when not found", async () => {
      accountRepo.findByAccountNumber.mockResolvedValue(null);

      const result = await service.getAccountByAccountNumber("9999999999");

      expect(result).toBeNull();
    });

    it("should throw when repository fails", async () => {
      accountRepo.findByAccountNumber.mockRejectedValue(new Error("DB error"));

      await expect(service.getAccountByAccountNumber("1234567890")).rejects.toThrow();
    });
  });

  describe("getUserAccounts", () => {
    it("should return all user accounts", async () => {
      const accounts = [mockAccount, { ...mockAccount, id: "account_456" as any }];
      accountRepo.findByUserId.mockResolvedValue(accounts);

      const result = await service.getUserAccounts("user_123" as any);

      expect(result).toHaveLength(2);
      expect(accountRepo.findByUserId).toHaveBeenCalledWith("user_123");
    });

    it("should return empty array for user with no accounts", async () => {
      accountRepo.findByUserId.mockResolvedValue([]);

      const result = await service.getUserAccounts("user_999" as any);

      expect(result).toEqual([]);
    });
  });

  describe("getBalance", () => {
    it("should return the account balance", async () => {
      accountRepo.checkBalance.mockResolvedValue(mockAccount);

      const result = await service.getBalance("account_123" as any);

      expect(result).toBe(5000);
    });

    it("should throw when account not found", async () => {
      accountRepo.checkBalance.mockRejectedValue(new Error("Not found"));

      await expect(service.getBalance("bad_id" as any)).rejects.toThrow();
    });
  });

  // ── Deposit ──────────────────────────────────────────────────────

  describe("deposit", () => {
    const depositInput = {
      userId: "user_123" as any,
      accountNumber: "1234567890" as any,
      amount: 500,
    };

    beforeEach(() => {
      accountRepo.findByAccountNumber.mockResolvedValue(mockAccount);
      accountRepo.adjustBalance.mockResolvedValue(5500);
      transactionRepo.save.mockResolvedValue(undefined);
      ledgerRepo.create.mockResolvedValue({} as ILedger);
    });

    it("should deposit funds and return updated account", async () => {
      const updatedAccount = { ...mockAccount, balance: 5500 };
      accountRepo.findByAccountNumber.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce(updatedAccount);

      const result = await service.deposit(depositInput);

      expect(result).toEqual(updatedAccount);
      expect(accountRepo.adjustBalance).toHaveBeenCalledWith("1234567890", 500);
    });

    it("should save a success transaction record", async () => {
      const updatedAccount = { ...mockAccount, balance: 5500 };
      accountRepo.findByAccountNumber.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce(updatedAccount);

      await service.deposit(depositInput);

      expect(transactionRepo.save).toHaveBeenCalledTimes(1);
      const savedTx = transactionRepo.save.mock.calls[0][0];
      expect(savedTx.status).toBe("success");
      expect(savedTx.amount).toBe(BigInt(50000));
      expect(savedTx.senderAccountNumber).toBe(depositInput.accountNumber);
      expect(savedTx.receiverAccountNumber).toBe(depositInput.accountNumber);
    });

    it("should create debit and credit ledger entries", async () => {
      const updatedAccount = { ...mockAccount, balance: 5500 };
      accountRepo.findByAccountNumber.mockResolvedValueOnce(mockAccount).mockResolvedValueOnce(updatedAccount);

      await service.deposit(depositInput);

      expect(ledgerRepo.create).toHaveBeenCalledTimes(2);
      const calls = ledgerRepo.create.mock.calls;
      const debitCall = calls.find((c: any) => c[0].entryType === "debit");
      const creditCall = calls.find((c: any) => c[0].entryType === "credit");
      expect(debitCall).toBeDefined();
      expect(creditCall).toBeDefined();
      expect(debitCall![0].amount).toBe(50000);
      expect(creditCall![0].amount).toBe(50000);
    });

    it("should throw when account not found", async () => {
      accountRepo.findByAccountNumber.mockResolvedValue(null);

      await expect(service.deposit(depositInput)).rejects.toThrow();
    });

    it("should throw when repository fails", async () => {
      accountRepo.findByAccountNumber.mockRejectedValue(new Error("DB error"));

      await expect(service.deposit(depositInput)).rejects.toThrow();
    });
  });

  // ── Transfer (Orchestrated Operation) ────────────────────────────

  describe("transfer", () => {
    const transferInput = {
      amount: 1000,
      userId: "user_123" as any,
      senderAccountNumber: "1111111111",
      senderName: "Alice",
      receiverAccountNumber: "2222222222",
      receiverName: "Bob",
      createdAt: new Date("2024-01-01"),
    };

    beforeEach(() => {
      accountRepo.calculateNewBalance.mockResolvedValue(5000);
      accountRepo.adjustBalance.mockResolvedValue(5000);
      accountRepo.updateBalance.mockResolvedValue(undefined);
      transactionRepo.save.mockResolvedValue(undefined);
      transactionRepo.update.mockResolvedValue({
        id: "tx_123" as any,
        amount: BigInt(100000),
        userId: "user_123" as any,
        senderAccountNumber: "1111111111",
        senderName: "Alice",
        receiverAccountNumber: "2222222222",
        receiverName: "Bob",
        status: "success" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      ledgerRepo.create.mockResolvedValue({} as ILedger);
    });

    it("should orchestrate a full transfer and return the transaction", async () => {
      const result = await service.transfer(transferInput);

      expect(result.status).toBe("success");
      expect(result.amount).toBe(BigInt(100000));
      expect(result.senderName).toBe("Alice");
      expect(result.receiverName).toBe("Bob");
    });

    it("should validate sender balance first", async () => {
      await service.transfer(transferInput);

      expect(accountRepo.adjustBalance).toHaveBeenNthCalledWith(1, "1111111111", -1000);
      expect(accountRepo.adjustBalance).toHaveBeenNthCalledWith(2, "2222222222", 1000);
    });

    it("should debit sender and credit receiver", async () => {
      await service.transfer(transferInput);

      expect(accountRepo.adjustBalance).toHaveBeenCalledTimes(2);
    });

    it("should save transaction record with BigInt amount", async () => {
      await service.transfer(transferInput);

      expect(transactionRepo.save).toHaveBeenCalledTimes(1);
      const savedTx = transactionRepo.save.mock.calls[0][0];
      expect(savedTx.amount).toBe(BigInt(100000));
      expect(savedTx.status).toBe("pending");
    });

    it("should create debit and credit ledger entries automatically", async () => {
      await service.transfer(transferInput);

      expect(ledgerRepo.create).toHaveBeenCalledTimes(2);

      const calls = ledgerRepo.create.mock.calls;
      const debitCall = calls.find((c: any) => c[0].entryType === "debit");
      const creditCall = calls.find((c: any) => c[0].entryType === "credit");

      expect(debitCall).toBeDefined();
      expect(creditCall).toBeDefined();
      expect(debitCall![0].amount).toBe(100000);
      expect(creditCall![0].amount).toBe(100000);
    });

    it("should throw when sender has insufficient funds", async () => {
      accountRepo.adjustBalance.mockRejectedValueOnce(
        new Error("Insufficient funds"),
      );

      await expect(service.transfer(transferInput)).rejects.toThrow();
    });

    it("should throw when transaction save fails", async () => {
      transactionRepo.save.mockRejectedValueOnce(new Error("Save failed"));

      await expect(service.transfer(transferInput)).rejects.toThrow();
    });
  });

  // ── Transaction Queries ──────────────────────────────────────────

  describe("listTransactions", () => {
    it("should return transactions with BigInt amount", async () => {
      transactionRepo.findByUserId.mockResolvedValue([
        {
          id: "tx_1" as any,
          amount: BigInt(500000),
          userId: "user_123" as any,
          senderAccountNumber: "1111111111",
          senderName: "Alice",
          receiverAccountNumber: "2222222222",
          receiverName: "Bob",
          status: "success" as const,
          createdAt: new Date(),
          updatedAt: null,
        },
      ]);

      const result = await service.listTransactions("user_123" as any);

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(BigInt(500000));
      expect(typeof result[0].amount).toBe("bigint");
    });

    it("should throw when query fails", async () => {
      transactionRepo.findByUserId.mockRejectedValue(new Error("DB error"));

      await expect(service.listTransactions("user_123" as any)).rejects.toThrow();
    });
  });

  describe("queryTransactions", () => {
    const userId = "user_123" as any;

    it("should query successful transactions", async () => {
      transactionRepo.successfulTransactions.mockResolvedValue([
        {
          id: "tx_1" as any,
          amount: BigInt(200000),
          userId,
          senderAccountNumber: "1111111111",
          senderName: "Alice",
          receiverAccountNumber: "2222222222",
          receiverName: "Bob",
          status: "success" as const,
          createdAt: new Date(),
          updatedAt: null,
        },
      ]);

      const result = await service.queryTransactions({ status: "success" }, userId);

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(BigInt(200000));
    });

    it("should query failed transactions", async () => {
      transactionRepo.failedTransactions.mockResolvedValue([
        {
          id: "tx_2" as any,
          amount: BigInt(50000),
          userId,
          senderAccountNumber: "1111111111",
          senderName: "Alice",
          receiverAccountNumber: "2222222222",
          receiverName: "Bob",
          status: "failed" as const,
          createdAt: new Date(),
          updatedAt: null,
        },
      ]);

      const result = await service.queryTransactions({ status: "failed" }, userId);

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("failed");
      expect(result[0].amount).toBe(BigInt(50000));
    });

    it("should pass date range filter to repository", async () => {
      const dateRange = {
        from: new Date("2024-01-01"),
        to: new Date("2024-01-31"),
      };
      transactionRepo.successfulTransactions.mockResolvedValue([]);

      await service.queryTransactions({ status: "success", dateRange }, userId);

      expect(transactionRepo.successfulTransactions).toHaveBeenCalledWith({
        userId,
        dateRange,
      });
    });

    it("should throw for invalid status", async () => {
      await expect(
        service.queryTransactions({ status: "invalid" as any }, userId),
      ).rejects.toThrow();
    });
  });

  // ── Ledger Operations ────────────────────────────────────────────

  describe("getLedgerEntries", () => {
    it("should return ledger entries for a transaction", async () => {
      const entries: ILedger[] = [
        {
          id: "entry_1" as any,
          transactionId: "tx_123" as any,
          amount: 100000,
          entryType: "debit",
          createdAt: new Date("2024-01-01"),
          updatedAt: null,
        },
        {
          id: "entry_2" as any,
          transactionId: "tx_123" as any,
          amount: 100000,
          entryType: "credit",
          createdAt: new Date("2024-01-01"),
          updatedAt: null,
        },
      ];
      ledgerRepo.findByTransactionId.mockResolvedValue(entries);

      const result = await service.getLedgerEntries("tx_123" as any);

      expect(result).toHaveLength(2);
      expect(result[0].entryType).toBe("debit");
      expect(result[1].entryType).toBe("credit");
    });

    it("should return empty array when no entries exist", async () => {
      ledgerRepo.findByTransactionId.mockResolvedValue([]);

      const result = await service.getLedgerEntries("tx_999" as any);

      expect(result).toEqual([]);
    });

    it("should throw when retrieval fails", async () => {
      ledgerRepo.findByTransactionId.mockRejectedValue(new Error("DB error"));

      await expect(service.getLedgerEntries("tx_123" as any)).rejects.toThrow();
    });
  });
});
