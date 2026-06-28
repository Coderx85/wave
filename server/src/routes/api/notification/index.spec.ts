import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";

const { listNotificationsHandlerMock, streamNotificationsHandlerMock, getPreferencesHandlerMock, updatePreferenceHandlerMock, markReadHandlerMock, dismissHandlerMock } = vi.hoisted(() => ({
  listNotificationsHandlerMock: vi.fn(),
  streamNotificationsHandlerMock: vi.fn(),
  getPreferencesHandlerMock: vi.fn(),
  updatePreferenceHandlerMock: vi.fn(),
  markReadHandlerMock: vi.fn(),
  dismissHandlerMock: vi.fn(),
}));

vi.mock("./handler", () => ({
  notificationController: {
    listNotificationsHandler: listNotificationsHandlerMock,
    streamNotificationsHandler: streamNotificationsHandlerMock,
    getPreferencesHandler: getPreferencesHandlerMock,
    updatePreferenceHandler: updatePreferenceHandlerMock,
    markReadHandler: markReadHandlerMock,
    dismissHandler: dismissHandlerMock,
  },
}));

import notificationRoute from "./index";

describe("Notification API route registration", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = (await import("fastify")).default();

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

  it("registers the GET preferences endpoint", async () => {
    getPreferencesHandlerMock.mockImplementation(async (_request, reply) =>
      reply.code(200).send({
        ok: true,
        status: 200,
        message: "SUCCESSFULLY_FETCHED_PREFERENCES",
        data: [],
      }),
    );

    const response = await app.inject({
      method: "GET",
      url: "/users/user_1/notification-preferences",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      message: "SUCCESSFULLY_FETCHED_PREFERENCES",
      data: [],
    });
  });

  it("registers the PUT preferences endpoint", async () => {
    updatePreferenceHandlerMock.mockImplementation(async (_request, reply) =>
      reply.code(200).send({
        ok: true,
        status: 200,
        message: "SUCCESSFULLY_UPDATED_PREFERENCE",
        data: { userId: "user_1", eventType: "deposit", enabled: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      }),
    );

    const response = await app.inject({
      method: "PUT",
      url: "/users/user_1/notification-preferences",
      payload: { eventType: "deposit", enabled: false },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      ok: true,
      message: "SUCCESSFULLY_UPDATED_PREFERENCE",
    });
  });
});