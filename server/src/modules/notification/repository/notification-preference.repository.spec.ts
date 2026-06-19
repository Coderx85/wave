import { describe, it, expect, beforeEach, vi } from "vitest";
import type { IPostgresStore } from "@/lib/repository";
import { NotificationPreferenceRepository } from "./notification-preference.repository";

function mockWhere(rows: any[]) {
  return vi.fn().mockResolvedValue(rows);
}

function mockFrom(whereFn: ReturnType<typeof mockWhere>) {
  return vi.fn().mockReturnValue({ where: whereFn });
}

function mockSelect(fromFn: ReturnType<typeof mockFrom>) {
  return vi.fn().mockReturnValue({ from: fromFn });
}

function mockLimit(rows: any[]) {
  return vi.fn().mockResolvedValue(rows);
}

function mockWhereLimit(limitFn: ReturnType<typeof mockLimit>) {
  return vi.fn().mockReturnValue({ limit: limitFn });
}

function mockFromLimit(whereLimitFn: ReturnType<typeof mockWhereLimit>) {
  return vi.fn().mockReturnValue({ where: whereLimitFn });
}

function mockSelectLimit(fromLimitFn: ReturnType<typeof mockFromLimit>) {
  return vi.fn().mockReturnValue({ from: fromLimitFn });
}

function mockInsertReturning(row: any) {
  return vi.fn().mockResolvedValue([row]);
}

function mockOnConflict(returningFn: ReturnType<typeof mockInsertReturning>) {
  return vi.fn().mockReturnValue({ returning: returningFn });
}

function mockValues(onConflictFn: ReturnType<typeof mockOnConflict>) {
  return vi.fn().mockReturnValue({ onConflictDoUpdate: onConflictFn });
}

function mockInsert(valuesFn: ReturnType<typeof mockValues>) {
  return vi.fn().mockReturnValue({ values: valuesFn });
}

function makePg(client: Record<string, any>) {
  return {
    client,
    run: vi.fn().mockImplementation(async (fn: () => Promise<any>) => fn()),
    transaction: vi.fn(),
  } as IPostgresStore;
}

describe("NotificationPreferenceRepository", () => {
  describe("findByUserId", () => {
    it("returns preferences for a user", async () => {
      const rows = [
        { userId: "u1", eventType: "deposit", enabled: true, createdAt: new Date(), updatedAt: new Date() },
        { userId: "u1", eventType: "transfer_incoming", enabled: false, createdAt: new Date(), updatedAt: new Date() },
      ];
      const whereFn = mockWhere(rows);
      const fromFn = mockFrom(whereFn);
      const selectFn = mockSelect(fromFn);
      const repo = new NotificationPreferenceRepository({ pg: makePg({ select: selectFn } as any) });

      const result = await repo.findByUserId("u1");

      expect(result).toHaveLength(2);
      expect(result[0].eventType).toBe("deposit");
      expect(result[0].enabled).toBe(true);
      expect(result[1].eventType).toBe("transfer_incoming");
      expect(result[1].enabled).toBe(false);
      expect(selectFn).toHaveBeenCalled();
    });

    it("returns empty array when no preferences exist", async () => {
      const whereFn = mockWhere([]);
      const fromFn = mockFrom(whereFn);
      const selectFn = mockSelect(fromFn);
      const repo = new NotificationPreferenceRepository({ pg: makePg({ select: selectFn } as any) });

      const result = await repo.findByUserId("u1");

      expect(result).toEqual([]);
    });
  });

  describe("upsert", () => {
    it("inserts a new preference", async () => {
      const row = { userId: "u1", eventType: "transfer_outgoing", enabled: false, createdAt: new Date(), updatedAt: new Date() };
      const returningFn = mockInsertReturning(row);
      const onConflictFn = mockOnConflict(returningFn);
      const valuesFn = mockValues(onConflictFn);
      const insertFn = mockInsert(valuesFn);
      const repo = new NotificationPreferenceRepository({ pg: makePg({ insert: insertFn } as any) });

      const result = await repo.upsert("u1", "transfer_outgoing", false);

      expect(result.eventType).toBe("transfer_outgoing");
      expect(result.enabled).toBe(false);
      expect(result.userId).toBe("u1");
      expect(insertFn).toHaveBeenCalled();
    });

    it("updates an existing preference", async () => {
      const row = { userId: "u1", eventType: "deposit", enabled: false, createdAt: new Date(), updatedAt: new Date() };
      const returningFn = mockInsertReturning(row);
      const onConflictFn = mockOnConflict(returningFn);
      const valuesFn = mockValues(onConflictFn);
      const insertFn = mockInsert(valuesFn);
      const repo = new NotificationPreferenceRepository({ pg: makePg({ insert: insertFn } as any) });

      const result = await repo.upsert("u1", "deposit", false);

      expect(result.enabled).toBe(false);
    });
  });

  describe("isEventEnabled", () => {
    it("returns true when no preference row exists", async () => {
      const limitFn = mockLimit([]);
      const whereLimitFn = mockWhereLimit(limitFn);
      const fromLimitFn = mockFromLimit(whereLimitFn);
      const selectLimitFn = mockSelectLimit(fromLimitFn);
      const repo = new NotificationPreferenceRepository({ pg: makePg({ select: selectLimitFn } as any) });

      const result = await repo.isEventEnabled("u1", "deposit");

      expect(result).toBe(true);
    });

    it("returns the stored value when preference exists", async () => {
      const limitFn = mockLimit([{ enabled: false }]);
      const whereLimitFn = mockWhereLimit(limitFn);
      const fromLimitFn = mockFromLimit(whereLimitFn);
      const selectLimitFn = mockSelectLimit(fromLimitFn);
      const repo = new NotificationPreferenceRepository({ pg: makePg({ select: selectLimitFn } as any) });

      const result = await repo.isEventEnabled("u1", "deposit");

      expect(result).toBe(false);
    });
  });
});
