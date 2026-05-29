/**
 * Idempotency Utility for Wallet Operations
 * Ensures that wallet operations (transactions, balance updates) can be safely retried
 * without causing duplicate or inconsistent state changes
 */

import { createHash } from "crypto";

export interface IdempotencyKey {
  key: string;
  hash: string;
  timestamp: number;
  operation: "transaction" | "balance_update" | "account_creation";
}

export interface IdempotencyRecord {
  key: string;
  operation: "transaction" | "balance_update" | "account_creation";
  status: "pending" | "completed" | "failed";
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

/**
 * Generates a deterministic idempotency key from operation parameters
 * The same parameters will always generate the same key
 */
export class IdempotencyManager {
  private static readonly DEFAULT_TTL_HOURS = 24;
  private static readonly HASH_ALGORITHM = "sha256";

  /**
   * Generates an idempotency key for a transaction
   * @param senderId Sender account ID
   * @param receiverId Receiver account ID
   * @param amount Transaction amount
   * @param timestamp Optional timestamp (for deterministic key generation)
   * @returns IdempotencyKey
   */
  static generateTransactionKey(
    senderId: string,
    receiverId: string,
    amount: number,
    timestamp?: number
  ): IdempotencyKey {
    const ts = timestamp || Date.now();
    const keyData = `transaction:${senderId}:${receiverId}:${amount}:${ts}`;
    const hash = this.hashKey(keyData);

    return {
      key: `txn_${hash}`,
      hash,
      timestamp: ts,
      operation: "transaction",
    };
  }

  /**
   * Generates an idempotency key for a balance update
   * @param accountId Account ID being updated
   * @param amount Amount to update by
   * @param reason Reason for update (e.g., "transaction", "correction")
   * @param timestamp Optional timestamp
   * @returns IdempotencyKey
   */
  static generateBalanceUpdateKey(
    accountId: string,
    amount: number,
    reason: string,
    timestamp?: number
  ): IdempotencyKey {
    const ts = timestamp || Date.now();
    const keyData = `balance_update:${accountId}:${amount}:${reason}:${ts}`;
    const hash = this.hashKey(keyData);

    return {
      key: `bal_${hash}`,
      hash,
      timestamp: ts,
      operation: "balance_update",
    };
  }

  /**
   * Generates an idempotency key for account creation
   * @param userId User ID
   * @param accountName Account name
   * @param timestamp Optional timestamp
   * @returns IdempotencyKey
   */
  static generateAccountCreationKey(
    userId: string,
    accountName: string,
    timestamp?: number
  ): IdempotencyKey {
    const ts = timestamp || Date.now();
    const keyData = `account:${userId}:${accountName}:${ts}`;
    const hash = this.hashKey(keyData);

    return {
      key: `acc_${hash}`,
      hash,
      timestamp: ts,
      operation: "account_creation",
    };
  }

  /**
   * Creates a custom idempotency key
   * @param data Object or string to generate key from
   * @param operation Operation type
   * @returns IdempotencyKey
   */
  static generateCustomKey(
    data: unknown,
    operation: "transaction" | "balance_update" | "account_creation"
  ): IdempotencyKey {
    const keyData = typeof data === "string" ? data : JSON.stringify(data);
    const hash = this.hashKey(keyData);

    return {
      key: `cst_${hash}`,
      hash,
      timestamp: Date.now(),
      operation,
    };
  }

  /**
   * Validates if an idempotency key is still valid
   * @param key IdempotencyKey to validate
   * @param ttlHours Time-to-live in hours
   * @returns True if key is valid and not expired
   */
  static isKeyValid(key: IdempotencyKey, ttlHours: number = this.DEFAULT_TTL_HOURS): boolean {
    const expiryTime = key.timestamp + ttlHours * 60 * 60 * 1000;
    return Date.now() < expiryTime;
  }

  /**
   * Calculates expiry date for an idempotency record
   * @param ttlHours Time-to-live in hours
   * @returns Date when record expires
   */
  static calculateExpiry(ttlHours: number = this.DEFAULT_TTL_HOURS): Date {
    return new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  }

  /**
   * Verifies idempotency for a repeated operation
   * Checks if operation should be retried or if cached result should be used
   * @param record Previous idempotency record
   * @param ttlHours Time-to-live in hours
   * @returns Object with shouldRetry flag and cached result if available
   */
  static verifyIdempotency(
    record: IdempotencyRecord | null,
    ttlHours: number = this.DEFAULT_TTL_HOURS
  ): { shouldRetry: boolean; cachedResult?: unknown } {
    if (!record) {
      return { shouldRetry: true };
    }

    const isExpired = Date.now() > record.expiresAt.getTime();

    if (isExpired) {
      return { shouldRetry: true };
    }

    switch (record.status) {
      case "completed":
        return { shouldRetry: false, cachedResult: record.result };
      case "pending":
        return { shouldRetry: false };
      case "failed":
        return { shouldRetry: true };
      default:
        return { shouldRetry: true };
    }
  }

  /**
   * Creates an idempotency record for tracking operation state
   * @param key IdempotencyKey
   * @param status Operation status
   * @param result Optional result if completed
   * @param error Optional error message if failed
   * @returns IdempotencyRecord
   */
  static createRecord(
    key: IdempotencyKey,
    status: "pending" | "completed" | "failed",
    result?: unknown,
    error?: string
  ): IdempotencyRecord {
    const now = new Date();

    return {
      key: key.key,
      operation: key.operation,
      status,
      result,
      error,
      createdAt: now,
      updatedAt: now,
      expiresAt: this.calculateExpiry(),
    };
  }

  /**
   * Updates an idempotency record status
   * @param record Record to update
   * @param status New status
   * @param result Optional result if completed
   * @param error Optional error message if failed
   * @returns Updated IdempotencyRecord
   */
  static updateRecord(
    record: IdempotencyRecord,
    status: "pending" | "completed" | "failed",
    result?: unknown,
    error?: string
  ): IdempotencyRecord {
    return {
      ...record,
      status,
      result: result ?? record.result,
      error: error ?? record.error,
      updatedAt: new Date(),
    };
  }

  /**
   * Detects duplicate operations within a time window
   * @param operations Array of operations with timestamps
   * @param windowMs Time window in milliseconds to check
   * @returns Array of duplicate groups (each group has multiple operations)
   */
  static detectDuplicates(
    operations: Array<{ key: string; timestamp: number }>,
    windowMs: number = 5000
  ): Array<Array<{ key: string; timestamp: number }>> {
    const now = Date.now();
    const recentOps = operations.filter(op => now - op.timestamp < windowMs);

    const groups = new Map<string, Array<{ key: string; timestamp: number }>>();

    for (const op of recentOps) {
      const existing = groups.get(op.key) ?? [];
      existing.push(op);
      groups.set(op.key, existing);
    }

    return Array.from(groups.values()).filter(group => group.length > 1);
  }

  /**
   * Generates a unique operation ID for tracking
   * Combines timestamp with random identifier
   * @returns Unique operation ID
   */
  static generateOperationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `op_${timestamp}_${random}`;
  }

  /**
   * Extracts idempotency key from request headers
   * Follows standard idempotency key header conventions
   * @param headers Request headers object
   * @returns Idempotency key or undefined
   */
  static extractFromHeaders(headers: Record<string, unknown>): string | undefined {
    const key =
      (headers["idempotency-key"] as string) ||
      (headers["Idempotency-Key"] as string) ||
      (headers["X-Idempotency-Key"] as string);

    return key?.trim();
  }

  /**
   * Private: Generates SHA256 hash of input
   */
  private static hashKey(data: string): string {
    return createHash(this.HASH_ALGORITHM)
      .update(data)
      .digest("hex")
      .substring(0, 16);
  }
}

export default IdempotencyManager;
