import { describe, it, expect } from "vitest";
import * as schema from "./wallet.schema";

describe("createAccountBodySchema", () => {
  const validInput = {
    name: "Alice's Checking",
    userId: "user_1",
    accountNumber: 123456789,
    balance: 1000,
  };

  it("accepts valid input", () => {
    const result = schema.createAccountBodySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("transforms accountNumber to string", () => {
    const result = schema.createAccountBodySchema.parse(validInput);
    expect(typeof result.accountNumber).toBe("string");
    expect(result.accountNumber).toBe("123456789");
  });

  it("rejects missing name", () => {
    const result = schema.createAccountBodySchema.safeParse({ ...validInput, name: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects non-string userId", () => {
    const result = schema.createAccountBodySchema.safeParse({ ...validInput, userId: 123 });
    expect(result.success).toBe(false);
  });

  it("accepts string accountNumber", () => {
    const result = schema.createAccountBodySchema.safeParse({ ...validInput, accountNumber: "999" });
    expect(result.success).toBe(true);
  });

  it("rejects non-numeric balance", () => {
    const result = schema.createAccountBodySchema.safeParse({ ...validInput, balance: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("depositBodySchema", () => {
  const validInput = {
    userId: "user_1",
    accountId: "456",
    amount: 100,
  };

  it("accepts valid input", () => {
    const result = schema.depositBodySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("returns accountId as string", () => {
    const result = schema.depositBodySchema.parse(validInput);
    expect(typeof result.accountId).toBe("string");
    expect(result.accountId).toBe("456");
  });

  it("rejects negative amount", () => {
    const result = schema.depositBodySchema.safeParse({ ...validInput, amount: -50 });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = schema.depositBodySchema.safeParse({ ...validInput, amount: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects missing userId", () => {
    const result = schema.depositBodySchema.safeParse({ accountId: "456", amount: 100 });
    expect(result.success).toBe(false);
  });
});

describe("transferBodySchema", () => {
  const validInput = {
    userId: "user_1",
    senderAccountId: "123",
    senderName: "Alice",
    receiverAccountId: "456",
    receiverName: "Bob",
    amount: 50,
  };

  it("accepts valid input", () => {
    const result = schema.transferBodySchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("returns senderAccountId as string", () => {
    const result = schema.transferBodySchema.parse(validInput);
    expect(typeof result.senderAccountId).toBe("string");
    expect(result.senderAccountId).toBe("123");
  });

  it("returns receiverAccountId as string", () => {
    const result = schema.transferBodySchema.parse(validInput);
    expect(typeof result.receiverAccountId).toBe("string");
    expect(result.receiverAccountId).toBe("456");
  });

  it("rejects missing senderName", () => {
    const result = schema.transferBodySchema.safeParse({ ...validInput, senderName: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric amount", () => {
    const result = schema.transferBodySchema.safeParse({ ...validInput, amount: "not-a-number" });
    expect(result.success).toBe(false);
  });

  it("rejects missing receiverAccountId", () => {
    const result = schema.transferBodySchema.safeParse({ ...validInput, receiverAccountId: undefined });
    expect(result.success).toBe(false);
  });
});

describe("accountNumberParamsSchema", () => {
  it("returns accountNumber as string", () => {
    const result = schema.accountNumberParamsSchema.parse({ accountNumber: "123" });
    expect(typeof result.accountNumber).toBe("string");
    expect(result.accountNumber).toBe("123");
  });

  it("rejects missing accountNumber", () => {
    const result = schema.accountNumberParamsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts numeric string", () => {
    const result = schema.accountNumberParamsSchema.safeParse({ accountNumber: "456" });
    expect(result.success).toBe(true);
  });
});

describe("accountIdParamsSchema", () => {
  it("returns accountId as string", () => {
    const result = schema.accountIdParamsSchema.parse({ accountId: "789" });
    expect(typeof result.accountId).toBe("string");
    expect(result.accountId).toBe("789");
  });

  it("rejects missing accountId", () => {
    const result = schema.accountIdParamsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts numeric string", () => {
    const result = schema.accountIdParamsSchema.safeParse({ accountId: "101" });
    expect(result.success).toBe(true);
  });
});

describe("userIdParamsSchema", () => {
  it("accepts valid userId", () => {
    const result = schema.userIdParamsSchema.safeParse({ userId: "user_1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing userId", () => {
    const result = schema.userIdParamsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-string userId", () => {
    const result = schema.userIdParamsSchema.safeParse({ userId: 123 });
    expect(result.success).toBe(false);
  });
});

describe("transactionIdParamsSchema", () => {
  it("accepts valid transactionId", () => {
    const result = schema.transactionIdParamsSchema.safeParse({ transactionId: "txn_1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing transactionId", () => {
    const result = schema.transactionIdParamsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("transactionQuerySchema", () => {
  it("accepts status 'success'", () => {
    const result = schema.transactionQuerySchema.safeParse({ status: "success" });
    expect(result.success).toBe(true);
  });

  it("accepts status 'failed'", () => {
    const result = schema.transactionQuerySchema.safeParse({ status: "failed" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status 'pending'", () => {
    const result = schema.transactionQuerySchema.safeParse({ status: "pending" });
    expect(result.success).toBe(false);
  });

  it("coerces date strings for from/to", () => {
    const result = schema.transactionQuerySchema.parse({
      status: "success",
      from: "2024-01-01",
      to: "2024-12-31",
    });
    expect(result.from).toBeInstanceOf(Date);
    expect(result.to).toBeInstanceOf(Date);
  });

  it("allows optional from/to", () => {
    const result = schema.transactionQuerySchema.safeParse({ status: "success" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.from).toBeUndefined();
      expect(result.data.to).toBeUndefined();
    }
  });

  it("rejects invalid date string for from", () => {
    const result = schema.transactionQuerySchema.safeParse({
      status: "success",
      from: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("walletAccountDTO", () => {
  const validDTO = {
    name: "Alice's Checking",
    userId: "user_1",
    accountNumber: "123",
    balance: 1000,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: null,
  };

  it("accepts valid DTO", () => {
    const result = schema.walletAccountDTO.safeParse(validDTO);
    expect(result.success).toBe(true);
  });

  it("accepts updatedAt as string", () => {
    const result = schema.walletAccountDTO.safeParse({ ...validDTO, updatedAt: "2024-06-01T00:00:00.000Z" });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = schema.walletAccountDTO.safeParse({ ...validDTO, name: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects non-number balance", () => {
    const result = schema.walletAccountDTO.safeParse({ ...validDTO, balance: "abc" });
    expect(result.success).toBe(false);
  });
});

describe("walletTransactionDTO", () => {
  const validDTO = {
    id: "txn_1",
    userId: "user_1",
    senderAccountId: "bank_account_1",
    senderName: "Alice",
    receiverAccountId: "bank_account_2",
    receiverName: "Bob",
    amount: "50.00",
    status: "success",
    createdAt: "2024-01-01T00:00:00.000Z",
  };

  it("accepts valid DTO", () => {
    const result = schema.walletTransactionDTO.safeParse(validDTO);
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = schema.walletTransactionDTO.safeParse({ ...validDTO, status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts optional updatedAt", () => {
    const result = schema.walletTransactionDTO.safeParse({
      ...validDTO,
      updatedAt: "2024-06-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});

describe("walletLedgerDTO", () => {
  const validDTO = {
    id: "ledger_1",
    transactionId: "txn_1",
    amount: "100.00",
    entryType: "debit",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: null,
  };

  it("accepts valid DTO", () => {
    const result = schema.walletLedgerDTO.safeParse(validDTO);
    expect(result.success).toBe(true);
  });

  it("rejects invalid entryType", () => {
    const result = schema.walletLedgerDTO.safeParse({ ...validDTO, entryType: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts 'credit' entryType", () => {
    const result = schema.walletLedgerDTO.safeParse({ ...validDTO, entryType: "credit" });
    expect(result.success).toBe(true);
  });
});

describe("createAccountResponseSchema", () => {
  it("has body and response keys", () => {
    expect(schema.createAccountResponseSchema).toHaveProperty("body");
    expect(schema.createAccountResponseSchema).toHaveProperty("response");
  });

  it("body schema matches createAccountBodySchema", () => {
    const bodyResult = schema.createAccountResponseSchema.body.safeParse({
      name: "Test",
      userId: "user_1",
      accountNumber: 123,
      balance: 500,
    });
    expect(bodyResult.success).toBe(true);
    if (bodyResult.success) {
      expect(typeof bodyResult.data.accountNumber).toBe("string");
    }
  });
});

describe("getAccountByNumberResponseSchema", () => {
  it("has params and response keys", () => {
    expect(schema.getAccountByNumberResponseSchema).toHaveProperty("params");
    expect(schema.getAccountByNumberResponseSchema).toHaveProperty("response");
  });

  it("params schema coerces accountNumber to string", () => {
    const result = schema.getAccountByNumberResponseSchema.params.parse({ accountNumber: "789" });
    expect(typeof result.accountNumber).toBe("string");
  });
});

describe("getAccountResponseSchema", () => {
  it("has params and response keys", () => {
    expect(schema.getAccountResponseSchema).toHaveProperty("params");
    expect(schema.getAccountResponseSchema).toHaveProperty("response");
  });
});

describe("getUserAccountsResponseSchema", () => {
  it("has params and response keys", () => {
    expect(schema.getUserAccountsResponseSchema).toHaveProperty("params");
    expect(schema.getUserAccountsResponseSchema).toHaveProperty("response");
  });
});

describe("getBalanceResponseSchema", () => {
  it("has params and response keys", () => {
    expect(schema.getBalanceResponseSchema).toHaveProperty("params");
    expect(schema.getBalanceResponseSchema).toHaveProperty("response");
  });
});

describe("depositResponseSchema", () => {
  it("has body and response keys", () => {
    expect(schema.depositResponseSchema).toHaveProperty("body");
    expect(schema.depositResponseSchema).toHaveProperty("response");
  });
});

describe("transferResponseSchema", () => {
  it("has body and response keys", () => {
    expect(schema.transferResponseSchema).toHaveProperty("body");
    expect(schema.transferResponseSchema).toHaveProperty("response");
  });
});

describe("listTransactionsResponseSchema", () => {
  it("has params and response keys", () => {
    expect(schema.listTransactionsResponseSchema).toHaveProperty("params");
    expect(schema.listTransactionsResponseSchema).toHaveProperty("response");
  });
});

describe("queryTransactionsResponseSchema", () => {
  it("has params, querystring, and response keys", () => {
    expect(schema.queryTransactionsResponseSchema).toHaveProperty("params");
    expect(schema.queryTransactionsResponseSchema).toHaveProperty("querystring");
    expect(schema.queryTransactionsResponseSchema).toHaveProperty("response");
  });
});

describe("getLedgerEntriesResponseSchema", () => {
  it("has params and response keys", () => {
    expect(schema.getLedgerEntriesResponseSchema).toHaveProperty("params");
    expect(schema.getLedgerEntriesResponseSchema).toHaveProperty("response");
  });
});
