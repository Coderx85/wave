import type { FastifyInstance } from "fastify";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const { createAccountHandlerMock, getBalanceHandlerMock, queryTransactionsHandlerMock } = vi.hoisted(() => ({
  createAccountHandlerMock: vi.fn(),
  getBalanceHandlerMock: vi.fn(),
  queryTransactionsHandlerMock: vi.fn(),
}));

vi.mock("./handler", () => ({
  walletController: {
    createAccountHandler: createAccountHandlerMock,
    getAccountByNumberHandler: vi.fn(),
    getAccountByIdHandler: vi.fn(),
    getUserAccountsHandler: vi.fn(),
    getBalanceHandler: getBalanceHandlerMock,
    depositHandler: vi.fn(),
    transferHandler: vi.fn(),
    listTransactionsHandler: vi.fn(),
    queryTransactionsHandler: queryTransactionsHandlerMock,
    getLedgerEntriesHandler: vi.fn(),
  },
}));

import walletRoute from "./index";

describe("Wallet API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = (await import("fastify")).default();
    await app.register(walletRoute);

    createAccountHandlerMock.mockImplementation(async (_request, reply) =>
      reply.code(201).send({
        ok: true,
        status: 201,
        message: "Successfully created account",
        data: {
          id: "bank_account_1",
          name: "Alice's Checking",
          userId: "user_1",
          accountNumber: "ACC-1",
          balance: 1000,
          createdAt: "2026-05-30T00:00:00.000Z",
          updatedAt: null,
        },
      }),
    );

    getBalanceHandlerMock.mockImplementation(async (_request, reply) =>
      reply.code(200).send({
        ok: true,
        status: 200,
        message: "Successfully fetched balance",
        data: {
          accountId: "bank_account_1",
          balance: 1000,
        },
      }),
    );

    queryTransactionsHandlerMock.mockImplementation(async (_request, reply) =>
      reply.code(200).send({
        ok: true,
        status: 200,
        message: "Successfully queried transactions",
        data: [],
      }),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it("registers create account endpoint", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/accounts",
      payload: {
        name: "Alice's Checking",
        userId: "user_1",
        accountNumber: "ACC-1",
        balance: 1000,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      ok: true,
      data: {
        id: "bank_account_1",
      },
    });
  });

  it("registers balance endpoint", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/accounts/bank_account_1/balance",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      data: {
        balance: 1000,
      },
    });
  });

  it("registers transaction query endpoint", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/users/user_1/transactions/query?status=success",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      data: [],
    });
  });
});
