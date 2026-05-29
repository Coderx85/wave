import { describe, it, expect, beforeEach, vi } from "vitest";
import { IdempotencyManager, type IdempotencyRecord } from "../index";

describe("IdempotencyManager", () => {
  describe("generateTransactionKey", () => {
    it("should generate consistent keys for same inputs", () => {
      const key1 = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100, 1000);
      const key2 = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100, 1000);

      expect(key1.key).toBe(key2.key);
      expect(key1.hash).toBe(key2.hash);
    });

    it("should generate different keys for different inputs", () => {
      const key1 = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      const key2 = IdempotencyManager.generateTransactionKey("acc1", "acc3", 100);

      expect(key1.key).not.toBe(key2.key);
    });

    it("should have transaction operation type", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      expect(key.operation).toBe("transaction");
    });

    it("should use current timestamp if not provided", () => {
      const beforeTime = Date.now();
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      const afterTime = Date.now();

      expect(key.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(key.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("should include prefix txn_ in key", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      expect(key.key).toMatch(/^txn_/);
    });
  });

  describe("generateBalanceUpdateKey", () => {
    it("should generate consistent keys for same inputs", () => {
      const key1 = IdempotencyManager.generateBalanceUpdateKey("acc1", 100, "transfer", 1000);
      const key2 = IdempotencyManager.generateBalanceUpdateKey("acc1", 100, "transfer", 1000);

      expect(key1.key).toBe(key2.key);
    });

    it("should have balance_update operation type", () => {
      const key = IdempotencyManager.generateBalanceUpdateKey("acc1", 100, "transfer");
      expect(key.operation).toBe("balance_update");
    });

    it("should include prefix bal_ in key", () => {
      const key = IdempotencyManager.generateBalanceUpdateKey("acc1", 100, "transfer");
      expect(key.key).toMatch(/^bal_/);
    });
  });

  describe("generateAccountCreationKey", () => {
    it("should generate consistent keys for same inputs", () => {
      const key1 = IdempotencyManager.generateAccountCreationKey("user1", "Savings", 1000);
      const key2 = IdempotencyManager.generateAccountCreationKey("user1", "Savings", 1000);

      expect(key1.key).toBe(key2.key);
    });

    it("should have account_creation operation type", () => {
      const key = IdempotencyManager.generateAccountCreationKey("user1", "Savings");
      expect(key.operation).toBe("account_creation");
    });

    it("should include prefix acc_ in key", () => {
      const key = IdempotencyManager.generateAccountCreationKey("user1", "Savings");
      expect(key.key).toMatch(/^acc_/);
    });
  });

  describe("generateCustomKey", () => {
    it("should generate key from string data", () => {
      const key = IdempotencyManager.generateCustomKey("custom_data", "transaction");
      expect(key.key).toMatch(/^cst_/);
      expect(key.operation).toBe("transaction");
    });

    it("should generate key from object data", () => {
      const data = { userId: "user1", amount: 100 };
      const key = IdempotencyManager.generateCustomKey(data, "balance_update");
      expect(key.operation).toBe("balance_update");
    });

    it("should be deterministic for same data", () => {
      const data = { test: "value" };
      const key1 = IdempotencyManager.generateCustomKey(data, "transaction");
      const key2 = IdempotencyManager.generateCustomKey(data, "transaction");

      expect(key1.key).toBe(key2.key);
    });
  });

  describe("isKeyValid", () => {
    it("should return true for recently generated key", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      expect(IdempotencyManager.isKeyValid(key)).toBe(true);
    });

    it("should return false for expired key", () => {
      const pastTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100, pastTimestamp);

      expect(IdempotencyManager.isKeyValid(key, 24)).toBe(false);
    });

    it("should respect custom TTL", () => {
      const pastTimestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100, pastTimestamp);

      expect(IdempotencyManager.isKeyValid(key, 1)).toBe(false);
      expect(IdempotencyManager.isKeyValid(key, 3)).toBe(true);
    });
  });

  describe("calculateExpiry", () => {
    it("should return future date", () => {
      const expiry = IdempotencyManager.calculateExpiry();
      expect(expiry.getTime()).toBeGreaterThan(Date.now());
    });

    it("should respect custom TTL", () => {
      const expiry1 = IdempotencyManager.calculateExpiry(1);
      const expiry24 = IdempotencyManager.calculateExpiry(24);

      expect(expiry24.getTime()).toBeGreaterThan(expiry1.getTime());
    });

    it("should be approximately 24 hours in future by default", () => {
      const expiry = IdempotencyManager.calculateExpiry(24);
      const expectedTime = Date.now() + 24 * 60 * 60 * 1000;
      const tolerance = 5000; // 5 second tolerance

      expect(Math.abs(expiry.getTime() - expectedTime)).toBeLessThan(tolerance);
    });
  });

  describe("verifyIdempotency", () => {
    it("should return shouldRetry=true for null record", () => {
      const result = IdempotencyManager.verifyIdempotency(null);
      expect(result.shouldRetry).toBe(true);
      expect(result.cachedResult).toBeUndefined();
    });

    it("should return cached result for completed operation", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      const record = IdempotencyManager.createRecord(key, "completed", { id: "tx_123" });

      const result = IdempotencyManager.verifyIdempotency(record);
      expect(result.shouldRetry).toBe(false);
      expect(result.cachedResult).toEqual({ id: "tx_123" });
    });

    it("should not retry pending operation", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      const record = IdempotencyManager.createRecord(key, "pending");

      const result = IdempotencyManager.verifyIdempotency(record);
      expect(result.shouldRetry).toBe(false);
    });

    it("should retry failed operation", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      const record = IdempotencyManager.createRecord(key, "failed", undefined, "Network error");

      const result = IdempotencyManager.verifyIdempotency(record);
      expect(result.shouldRetry).toBe(true);
    });

    it("should retry expired record regardless of status", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      let record = IdempotencyManager.createRecord(key, "completed", { id: "tx_123" });

      // Manually set expiry to past
      record = {
        ...record,
        expiresAt: new Date(Date.now() - 1000),
      };

      const result = IdempotencyManager.verifyIdempotency(record);
      expect(result.shouldRetry).toBe(true);
    });
  });

  describe("createRecord", () => {
    it("should create pending record", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      const record = IdempotencyManager.createRecord(key, "pending");

      expect(record.key).toBe(key.key);
      expect(record.status).toBe("pending");
      expect(record.operation).toBe("transaction");
      expect(record.result).toBeUndefined();
      expect(record.error).toBeUndefined();
    });

    it("should create completed record with result", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      const result = { id: "tx_123", status: "completed" };
      const record = IdempotencyManager.createRecord(key, "completed", result);

      expect(record.status).toBe("completed");
      expect(record.result).toEqual(result);
    });

    it("should create failed record with error", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      const record = IdempotencyManager.createRecord(key, "failed", undefined, "Database error");

      expect(record.status).toBe("failed");
      expect(record.error).toBe("Database error");
    });

    it("should set expiry date", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      const record = IdempotencyManager.createRecord(key, "pending");

      expect(record.expiresAt).toBeInstanceOf(Date);
      expect(record.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("updateRecord", () => {
    it("should update status", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      let record = IdempotencyManager.createRecord(key, "pending");

      record = IdempotencyManager.updateRecord(record, "completed", { id: "tx_123" });

      expect(record.status).toBe("completed");
      expect(record.result).toEqual({ id: "tx_123" });
    });

    it("should preserve previous result if not provided", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      let record = IdempotencyManager.createRecord(key, "completed", { id: "tx_123" });

      record = IdempotencyManager.updateRecord(record, "completed");

      expect(record.result).toEqual({ id: "tx_123" });
    });

    it("should update timestamp", () => {
      const key = IdempotencyManager.generateTransactionKey("acc1", "acc2", 100);
      let record = IdempotencyManager.createRecord(key, "pending");
      const originalTime = record.updatedAt;

      // Wait a bit to ensure timestamp difference
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 1000);

      record = IdempotencyManager.updateRecord(record, "completed", { id: "tx_123" });

      vi.useRealTimers();

      expect(record.updatedAt.getTime()).toBeGreaterThan(originalTime.getTime());
    });
  });

  describe("detectDuplicates", () => {
    it("should detect duplicate operations", () => {
      const timestamp = Date.now();
      const operations = [
        { key: "op_123", timestamp },
        { key: "op_123", timestamp: timestamp + 100 },
        { key: "op_456", timestamp: timestamp + 200 },
      ];

      const duplicates = IdempotencyManager.detectDuplicates(operations);

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0]).toHaveLength(2);
    });

    it("should exclude operations outside time window", () => {
      const timestamp = Date.now();
      const operations = [
        { key: "op_123", timestamp },
        { key: "op_123", timestamp: timestamp - 10000 }, // 10 seconds ago, outside default window
      ];

      const duplicates = IdempotencyManager.detectDuplicates(operations, 5000);

      expect(duplicates).toHaveLength(0);
    });

    it("should respect custom window", () => {
      const timestamp = Date.now();
      const operations = [
        { key: "op_123", timestamp },
        { key: "op_123", timestamp: timestamp - 3000 },
      ];

      const duplicates1 = IdempotencyManager.detectDuplicates(operations, 2000);
      const duplicates2 = IdempotencyManager.detectDuplicates(operations, 4000);

      expect(duplicates1).toHaveLength(0);
      expect(duplicates2).toHaveLength(1);
    });
  });

  describe("generateOperationId", () => {
    it("should generate unique operation IDs", () => {
      const id1 = IdempotencyManager.generateOperationId();
      const id2 = IdempotencyManager.generateOperationId();

      expect(id1).not.toBe(id2);
    });

    it("should include op_ prefix", () => {
      const id = IdempotencyManager.generateOperationId();
      expect(id).toMatch(/^op_/);
    });

    it("should include timestamp", () => {
      const id = IdempotencyManager.generateOperationId();
      const parts = id.split("_");

      expect(parts.length).toBe(3);
      expect(parseInt(parts[1])).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("extractFromHeaders", () => {
    it("should extract from standard header", () => {
      const headers = { "idempotency-key": "key_123" };
      const key = IdempotencyManager.extractFromHeaders(headers);

      expect(key).toBe("key_123");
    });

    it("should extract from capitalized header", () => {
      const headers = { "Idempotency-Key": "key_123" };
      const key = IdempotencyManager.extractFromHeaders(headers);

      expect(key).toBe("key_123");
    });

    it("should extract from X- prefixed header", () => {
      const headers = { "X-Idempotency-Key": "key_123" };
      const key = IdempotencyManager.extractFromHeaders(headers);

      expect(key).toBe("key_123");
    });

    it("should return undefined if no header present", () => {
      const headers = {};
      const key = IdempotencyManager.extractFromHeaders(headers);

      expect(key).toBeUndefined();
    });

    it("should trim whitespace", () => {
      const headers = { "idempotency-key": "  key_123  " };
      const key = IdempotencyManager.extractFromHeaders(headers);

      expect(key).toBe("key_123");
    });
  });
});
