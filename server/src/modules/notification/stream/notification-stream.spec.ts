import { describe, expect, it, vi } from "vitest";
import { NotificationStream } from "./notification-stream";

describe("NotificationStream", () => {
  it("publishes events to matching subscribers", () => {
    const stream = new NotificationStream();
    const listener = vi.fn();

    stream.subscribe("user_1", listener);
    stream.publish({
      type: "notification.created",
      notification: {
        id: "notification_1",
        transactionId: "txn_1",
        userId: "user_1",
        email: "user@example.com",
        subject: "Subject",
        message: "Message",
        status: "pending",
        sentAt: null,
        createdAt: new Date("2026-05-31T00:00:00.000Z"),
        updatedAt: new Date("2026-05-31T00:00:00.000Z"),
      },
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes listeners", () => {
    const stream = new NotificationStream();
    const listener = vi.fn();
    const unsubscribe = stream.subscribe("user_1", listener);

    unsubscribe();

    stream.publish({
      type: "notification.created",
      notification: {
        id: "notification_1",
        transactionId: "txn_1",
        userId: "user_1",
        email: "user@example.com",
        subject: "Subject",
        message: "Message",
        status: "pending",
        sentAt: null,
        createdAt: new Date("2026-05-31T00:00:00.000Z"),
        updatedAt: new Date("2026-05-31T00:00:00.000Z"),
      },
    });

    expect(listener).not.toHaveBeenCalled();
  });
});
