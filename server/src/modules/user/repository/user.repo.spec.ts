import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { IUserDBDTO } from "./user-repo.interface";
import type { TUserId } from "../../../types";
import { UserRepository } from "./user.repo";

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    eq: vi.fn(),
  };
});

describe("UserStore (Repository)", () => {
    let mockDb: {
      insert: ReturnType<typeof vi.fn>;
      select: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    let mockCache: {
      get: ReturnType<typeof vi.fn>;
      set: ReturnType<typeof vi.fn>;
      del: ReturnType<typeof vi.fn>;
      getOrSet: ReturnType<typeof vi.fn>;
    };

  const createMockUser = (overrides?: Partial<IUserDBDTO>): IUserDBDTO => ({
    id: `user_${Math.random()}` as TUserId,
    email: "test@example.com",
    name: "Test User",
    createdAt: new Date(),
    updatedAt: null,
    emailVerified: false,
    image: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {
      insert: vi.fn(),
      select: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      getOrSet: vi.fn(),
    };
    (UserRepository as any).cache = mockCache;
    (UserRepository as any).db = mockDb;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createUser", () => {
    it("should invalidate caches on user creation", async () => {
        const userData = createMockUser();
        (mockDb.insert as any).mockReturnValue({
            values: () => ({ returning: () => [userData] }),
        });
        await UserRepository.createUser(userData);
        expect(mockCache.del).toHaveBeenCalledWith(`user-by-email:${userData.email}`);
        expect(mockCache.del).toHaveBeenCalledWith(`user-by-id:${userData.id}`);
    });
  });

  describe("getUserByEmail", () => {
    it("should fetch from DB and set to cache on cache miss", async () => {
        const userData = createMockUser();
        (mockCache.getOrSet as any).mockImplementation(async (key: any, fn: any) => fn());
        (mockDb.select as any).mockReturnValue({
            from: () => ({ where: () => [userData] }),
        });

        const result = await UserRepository.getUserByEmail(userData.email);

        expect(result).toEqual(userData);
        expect(mockCache.getOrSet).toHaveBeenCalledWith(`user-by-email:${userData.email}`, expect.any(Function), 3600);
        expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("getUserById", () => {
    it("should fetch from DB and set to cache on cache miss", async () => {
        const userData = createMockUser();
        (mockCache.getOrSet as any).mockImplementation(async (key: any, fn: any) => fn());
        (mockDb.select as any).mockReturnValue({
            from: () => ({ where: () => [userData] }),
        });

        const result = await UserRepository.getUserById(userData.id);

        expect(result).toEqual(userData);
        expect(mockCache.getOrSet).toHaveBeenCalledWith(`user-by-id:${userData.id}`, expect.any(Function), 3600);
        expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("deleteUser", () => {
    it("should invalidate caches on user deletion", async () => {
        const userData = createMockUser();
        (mockCache.getOrSet as any).mockResolvedValue(userData);
        (mockDb.delete as any).mockReturnValue({
            where: () => Promise.resolve(),
        });

        await UserRepository.deleteUser(userData.id);

        expect(mockCache.del).toHaveBeenCalledWith(`user-by-id:${userData.id}`);
        expect(mockCache.del).toHaveBeenCalledWith(`user-by-email:${userData.email}`);
    });
  });

  describe("updateUser", () => {
    it("should invalidate caches on user update", async () => {
        const userData = createMockUser();
        (mockDb.update as any).mockReturnValue({
            set: () => ({ where: () => ({ returning: () => [userData] }) }),
        });

        await UserRepository.updateUser(userData);

        expect(mockCache.del).toHaveBeenCalledWith(`user-by-id:${userData.id}`);
        expect(mockCache.del).toHaveBeenCalledWith(`user-by-email:${userData.email}`);
    });
  });
});
