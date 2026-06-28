import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

const { benchmarkSSEHandlerMock, benchmarkConcurrentTransfersHandlerMock, benchmarkTransfersHandlerMock, benchmarkAccountsHandlerMock } = vi.hoisted(() => ({
  benchmarkSSEHandlerMock: vi.fn(),
  benchmarkConcurrentTransfersHandlerMock: vi.fn(),
  benchmarkTransfersHandlerMock: vi.fn(),
  benchmarkAccountsHandlerMock: vi.fn(),
}));

vi.mock("./handler", () => ({
  benchmarkSSEHandler: benchmarkSSEHandlerMock,
  benchmarkConcurrentTransfersHandler: benchmarkConcurrentTransfersHandlerMock,
  benchmarkTransfersHandler: benchmarkTransfersHandlerMock,
  benchmarkAccountsHandler: benchmarkAccountsHandlerMock,
}));

import performanceRoute from "./index";

describe("Performance API route registration", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = (await import("fastify")).default();

    benchmarkSSEHandlerMock.mockImplementation(async (_request, reply) => {
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "application/json",
      });
      reply.raw.end();
    });

    benchmarkConcurrentTransfersHandlerMock.mockImplementation(async (_request, reply) => {
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "application/json",
      });
      reply.raw.end();
    });

    benchmarkTransfersHandlerMock.mockImplementation(async (_request, reply) => {
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "application/json",
      });
      reply.raw.end();
    });

    benchmarkAccountsHandlerMock.mockImplementation(async (_request, reply) => {
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "application/json",
      });
      reply.raw.end();
    });

    await app.register(performanceRoute);
  });

  afterEach(async () => {
    await app.close();
  });

  it("registers the SSE benchmark endpoint", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/benchmark/sse",
      payload: {
        userId: "user_1",
        numConnections: 10,
        durationMs: 100,
      },
    });

    expect(response.statusCode).toBe(200);
  });
});