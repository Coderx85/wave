import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NotificationRepository } from "./notification-repo";
import type { INotification } from "./notification-repo.interface";

// Mock dependencies
vi.mock("@/modules/database/client", () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    returning: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
  },
}));

vi.mock("@/lib/try-catch-wrapper", () => ({
  tryCatch: async ({ ctx }: { ctx: () => Promise<any> }) => {
    return await ctx();
  },
}));

vi.mock("@/lib/ID", () => ({
  ID: {
    outboxId: vi.fn(() => "test-id"),
  },
}));

describe("NotificationRepository", () => {
  let repository: NotificationRepository;
  const mockDb = require("@/modules/database/client").db;
  const mockId = require("@/lib/ID").ID;

  beforeEach(() => {
    repository = new NotificationRepository();
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create a notification", async () => {
      const notificationData = {
        transactionId: "txn_123",
        userId: "user_123",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test Message",
        status: "pending",
      };

      const mockResult = [{ 
        id: "test-id",
        transactionId: "txn_123",
        userId: "user_123",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test Message",
        status: "pending",
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await repository.create(notificationData);

      expect(mockDb.insert).toHaveBeenCalledWith(require("@/modules/database/schema").NotificationsTable);
      expect(mockDb.insert().values).toHaveBeenCalledWith({
        id: "test-id",
        transactionId: "txn_123",
        userId: "user_123",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test Message",
        status: "pending",
      });
      expect(result).toEqual(mockResult[0]);
    });
  });

  describe("updateStatus", () => {
    it("should update notification status", async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      });

      await repository.updateStatus("test-id", "sent", new Date());

      expect(mockDb.update).toHaveBeenCalledWith(require("@/modules/database/schema").NotificationsTable);
      expect(mockDb.update().set).toHaveBeenCalledWith({
        status: "sent",
        sentAt: expect.any(Date),
      });
      expect(mockDb.update().set().where).toHaveBeenCalledWith(
        expect.objectContaining({
          eq: expect.any(Function),
        })
      );
    });

    it("should set sentAt when status is sent", async () => {
      const sentAt = new Date();
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      });

      await repository.updateStatus("test-id", "sent");

      expect(mockDb.update().set).toHaveBeenCalledWith({
        status: "sent",
        sentAt: expect.any(Date),
      });
    });

    it("should not set sentAt when status is not sent", async () => {
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      });

      await repository.updateStatus("test-id", "failed");

      expect(mockDb.update().set).toHaveBeenCalledWith({
        status: "failed",
        sentAt: undefined,
      });
    });
  });

  describe("findPending", () => {
    it("should find pending notifications", async () => {
      const mockResults = [
        {
          id: "1",
          transactionId: "txn_1",
          userId: "user_1",
          email: "test1@example.com",
          subject: "Subject 1",
          message: "Message 1",
          status: "pending",
          sentAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          transactionId: "txn_2",
          userId: "user_2",
          email: "test2@example.com",
          subject: "Subject 2",
          message: "Message 2",
          status: "pending",
          sentAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockResults),
      });

      const result = await repository.findPending(2);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.select().from).toHaveBeenCalledWith(require("@/modules/database/schema").NotificationsTable);
      expect(mockDb.select().from().where).toHaveBeenCalledWith(
        expect.objectContaining({
          eq: expect.any(Function),
        })
      );
      expect(mockDb.select().from().where().limit).toHaveBeenCalledWith(2);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockResults[0]);
    });
  });

  describe("findByTransactionId", () => {
    it("should find notification by transaction ID", async () => {
      const mockResult = [{
        id: "test-id",
        transactionId: "txn_123",
        userId: "user_123",
        email: "test@example.com",
        subject: "Test Subject",
        message: "Test Message",
        status: "pending",
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockResult),
      });

      const result = await repository.findByTransactionId("txn_123");

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.select().from).toHaveBeenCalledWith(require("@/modules/database/schema").NotificationsTable);
      expect(mockDb.select().from().where).toHaveBeenCalledWith(
        expect.objectContaining({
          eq: expect.any(Function),
        })
      );
      expect(mockDb.select().from().where().limit).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult[0]);
    });

    it("should return null when notification not found", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await repository.findByTransactionId("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("findByUserId", () => {
    it("should find notifications by user ID", async () => {
      const mockResults = [
        {
          id: "1",
          transactionId: "txn_1",
          userId: "user_123",
          email: "test1@example.com",
          subject: "Subject 1",
          message: "Message 1",
          status: "pending",
          sentAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          transactionId: "txn_2",
          userId: "user_123",
          email: "test2@example.com",
          subject: "Subject 2",
          message: "Message 2",
          status: "sent",
          sentAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockResults),
      });

      const result = await repository.findByUserId("user_123", 10);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.select().from).toHaveBeenCalledWith(require("@/modules/database/schema").NotificationsTable);
      expect(mockDb.select().from().where).toHaveBeenCalledWith(
        expect.objectContaining({
          eq: expect.any(Function),
        })
      );
      expect(mockDb.select().from().where().orderBy).toHaveBeenCalledWith(
        expect.objectContaining({
          desc: expect.any(Function),
        })
      );
      expect(mockDb.select().from().where().orderBy().limit).toHaveBeenCalledWith(10);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockResults[0]);
    });
  });
});