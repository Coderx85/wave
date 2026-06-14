import type { FastifyInstance } from "fastify";
import { validatorCompiler } from "fastify-type-provider-zod";
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
    app.setValidatorCompiler(validatorCompiler);
    await app.register(walletRoute);

    createAccountHandlerMock.mockImplementation(async (_request, reply) =>
      reply.code(201).send({
        ok: true,
        status: 201,
        message: "Successfully created account",
        data: {
          name: "Alice's Checking",
          userId: "user_1",
          accountNumber: 12345,
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
          accountNumber: 12345,
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

  describe("routes", () => {
    it("registers create account endpoint", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/accounts",
        payload: {
          name: "Alice's Checking",
          userId: "user_1",
          accountNumber: 12345,
          balance: 1000,
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toMatchObject({
        ok: true,
        data: {
          name: "Alice's Checking",
        },
      });
    });

    it("registers balance endpoint", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/accounts/12345/balance",
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

  describe("request validation", () => {
    describe("POST /accounts", () => {
      it("rejects missing body fields", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/accounts",
          payload: {
            name: "Alice's Checking",
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it("rejects non-numeric accountNumber", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/accounts",
          payload: {
            name: "Alice's Checking",
            userId: "user_1",
            accountNumber: "not-a-number",
            balance: 1000,
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /accounts/by-number/:accountNumber", () => {
      it("rejects non-numeric accountNumber param", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/accounts/by-number/abc",
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /accounts/:accountId", () => {
      it("rejects non-numeric accountId param", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/accounts/abc",
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /accounts/:accountId/balance", () => {
      it("rejects non-numeric accountId param", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/accounts/abc/balance",
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe("POST /transfers", () => {
      it("rejects missing body fields", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/transfers",
          payload: {
            userId: "user_1",
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /users/:userId/transactions/query", () => {
      it("rejects invalid status", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/users/user_1/transactions/query?status=pending",
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe("POST /accounts/:accountId/deposit", () => {
      it("rejects negative amount", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/accounts/999/deposit",
          payload: {
            userId: "user_1",
            accountId: 123,
            amount: -50,
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it("rejects missing fields", async () => {
        const response = await app.inject({
          method: "POST",
          url: "/accounts/999/deposit",
          payload: {
            userId: "user_1",
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });
});