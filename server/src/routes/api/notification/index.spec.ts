import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { validatorCompiler } from "fastify-type-provider-zod";
import type { FastifyInstance } from "fastify";

const { listNotificationsHandlerMock, streamNotificationsHandlerMock } = vi.hoisted(() => ({
  listNotificationsHandlerMock: vi.fn(),
  streamNotificationsHandlerMock: vi.fn(),
}));

vi.mock("./handler", () => ({
  notificationController: {
    listNotificationsHandler: listNotificationsHandlerMock,
    streamNotificationsHandler: streamNotificationsHandlerMock,
  },
}));

import notificationRoute from "./index";

describe("Notification API route registration", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = (await import("fastify")).default();
    app.setValidatorCompiler(validatorCompiler);

    listNotificationsHandlerMock.mockImplementation(async (_request, reply) =>
      reply.code(200).send({
        ok: true,
        status: 200,
        message: "SUCCESSFULLY FETCHED NOTIFICATIONS",
        data: [],
      }),
    );

    streamNotificationsHandlerMock.mockImplementation(async (_request, reply) => {
      reply.hijack();
      reply.raw.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
      });
      reply.raw.end();
    });

    await app.register(notificationRoute);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("routes", () => {
    it("registers the history endpoint", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/users/user_1/notifications?limit=10",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        ok: true,
        message: "SUCCESSFULLY FETCHED NOTIFICATIONS",
        data: [],
      });
    });

    it("registers the SSE endpoint", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/users/user_1/notifications/stream",
        headers: {
          accept: "text/event-stream",
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/event-stream");
    });
  });

  describe("request validation", () => {
    describe("GET /users/:userId/notifications", () => {
      it("rejects negative limit", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/users/user_1/notifications?limit=-1",
        });

        expect(response.statusCode).toBe(400);
      });

      it("rejects zero limit", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/users/user_1/notifications?limit=0",
        });

        expect(response.statusCode).toBe(400);
      });

      it("rejects limit exceeding maximum", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/users/user_1/notifications?limit=200",
        });

        expect(response.statusCode).toBe(400);
      });

      it("rejects non-numeric limit", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/users/user_1/notifications?limit=abc",
        });

        expect(response.statusCode).toBe(400);
      });
    });

    describe("GET /users/:userId/notifications/stream", () => {
      it("rejects negative limit in SSE", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/users/user_1/notifications/stream?limit=-5",
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });
});