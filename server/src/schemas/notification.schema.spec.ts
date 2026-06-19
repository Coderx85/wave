import { describe, it, expect } from "vitest";
import * as schema from "./notification.schema";

describe("notificationDTO", () => {
  const validDTO = {
    id: "notif_1",
    transactionId: "txn_1",
    userId: "user_1",
    email: "alice@example.com",
    subject: "Payment Received",
    message: "You received $50",
    status: "sent",
    read: false,
    sentAt: "2024-01-01T00:00:00Z",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  it("accepts valid DTO", () => {
    const result = schema.notificationDTO.safeParse(validDTO);
    expect(result.success).toBe(true);
  });

  it("accepts sentAt as null", () => {
    const result = schema.notificationDTO.safeParse({ ...validDTO, sentAt: null });
    expect(result.success).toBe(true);
  });

  it("coerces date strings", () => {
    const result = schema.notificationDTO.parse(validDTO);
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.sentAt).toBeInstanceOf(Date);
  });

  it("rejects invalid status", () => {
    const result = schema.notificationDTO.safeParse({ ...validDTO, status: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rejects missing id", () => {
    const result = schema.notificationDTO.safeParse({ ...validDTO, id: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = schema.notificationDTO.safeParse({ ...validDTO, email: undefined });
    expect(result.success).toBe(false);
  });
});

describe("notificationListQuerySchema", () => {
  it("accepts valid limit", () => {
    const result = schema.notificationListQuerySchema.safeParse({ limit: 10 });
    expect(result.success).toBe(true);
  });

  it("applies default limit of 50", () => {
    const result = schema.notificationListQuerySchema.parse({});
    expect(result.limit).toBe(50);
  });

  it("rejects negative limit", () => {
    const result = schema.notificationListQuerySchema.safeParse({ limit: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects zero limit", () => {
    const result = schema.notificationListQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects limit exceeding maximum", () => {
    const result = schema.notificationListQuerySchema.safeParse({ limit: 200 });
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric limit", () => {
    const result = schema.notificationListQuerySchema.safeParse({ limit: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer limit", () => {
    const result = schema.notificationListQuerySchema.safeParse({ limit: 3.5 });
    expect(result.success).toBe(false);
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

describe("listNotificationsResponseSchema", () => {
  it("has params, querystring, and response keys", () => {
    expect(schema.listNotificationsResponseSchema).toHaveProperty("params");
    expect(schema.listNotificationsResponseSchema).toHaveProperty("querystring");
    expect(schema.listNotificationsResponseSchema).toHaveProperty("response");
  });

  it("params schema matches userIdParamsSchema", () => {
    const result = schema.listNotificationsResponseSchema.params.safeParse({ userId: "user_1" });
    expect(result.success).toBe(true);
  });

  it("querystring schema applies default limit", () => {
    const result = schema.listNotificationsResponseSchema.querystring.parse({});
    expect(result.limit).toBe(50);
  });
});