import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { IUserDBDTO } from "../user.interface";
import type { TUserId } from "../../../types";

// Mock the database client and drizzle-orm BEFORE importing UserRepository
vi.mock("../../database/client");
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  between: vi.fn(),
  or: vi.fn(),
  relations: vi.fn(() => ({})),
  one: vi.fn(),
  many: vi.fn(),
}));

// Import after mocking
import { UserRepository } from "./user.repo";
import * as dbClient from "../../database/client";
import { eq } from "drizzle-orm";

describe("UserStore (Repository)", () => {
  // Helper to create db mock
  const createDbMock = () => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  });

  // Helper to setup chain mocks for select operations
  const setupSelectChain = (resultData: any[] = []) => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(resultData),
    }),
  });

  // Helper to setup chain mocks for insert operations
  const setupInsertChain = (resultData: any[] = []) => ({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(resultData),
    }),
  });

  // Helper to setup chain mocks for update operations
  const setupUpdateChain = (resultData: any[] = []) => ({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue(resultData),
      }),
    }),
  });

  // Helper to setup chain mocks for delete operations
  const setupDeleteChain = () => ({
    where: vi.fn().mockResolvedValue(undefined),
  });

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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createUser", () => {
    it("should create a new user", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);
      const insertChain = setupInsertChain([userData]);

      dbMock.insert.mockReturnValue(insertChain as any);

      const result = await UserRepository.createUser(userData);

      expect(result).toEqual(userData);
      expect(dbMock.insert).toHaveBeenCalled();
    });

    it("should throw error if user creation fails", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);
      const insertChain = setupInsertChain([]); // Empty result

      dbMock.insert.mockReturnValue(insertChain as any);

      await expect(UserRepository.createUser(userData)).rejects.toThrow(
        "Failed to create user"
      );
    });

    it("should handle database errors during creation", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);

      const insertChain = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      };

      dbMock.insert.mockReturnValue(insertChain as any);

      await expect(UserRepository.createUser(userData)).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("getUserByEmail", () => {
    it("should find user by email", async () => {
      const userData = createMockUser({ email: "findme@example.com" });
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const selectChain = setupSelectChain([userData]);

      dbMock.select.mockReturnValue(selectChain as any);
      eqMock.mockReturnValue({} as any);

      const result = await UserRepository.getUserByEmail("findme@example.com");

      expect(result).toEqual(userData);
      expect(dbMock.select).toHaveBeenCalled();
    });

    it("should return null if user not found by email", async () => {
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const selectChain = setupSelectChain([]); // Empty result

      dbMock.select.mockReturnValue(selectChain as any);
      eqMock.mockReturnValue({} as any);

      const result = await UserRepository.getUserByEmail("notfound@example.com");

      expect(result).toBeNull();
    });

    it("should handle database errors during email query", async () => {
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);

      const selectChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Query error")),
        }),
      };

      dbMock.select.mockReturnValue(selectChain as any);
      eqMock.mockReturnValue({} as any);

      await expect(UserRepository.getUserByEmail("test@example.com")).rejects.toThrow(
        "Query error"
      );
    });
  });

  describe("getUserById", () => {
    it("should find user by id", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const selectChain = setupSelectChain([userData]);

      dbMock.select.mockReturnValue(selectChain as any);
      eqMock.mockReturnValue({} as any);

      const result = await UserRepository.getUserById(userData.id);

      expect(result).toEqual(userData);
      expect(dbMock.select).toHaveBeenCalled();
    });

    it("should return null if user not found by id", async () => {
      const fakeId = `user_fake_${Math.random()}` as TUserId;
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const selectChain = setupSelectChain([]); // Empty result

      dbMock.select.mockReturnValue(selectChain as any);
      eqMock.mockReturnValue({} as any);

      const result = await UserRepository.getUserById(fakeId);

      expect(result).toBeNull();
    });

    it("should handle database errors during id query", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);

      const selectChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Query error")),
        }),
      };

      dbMock.select.mockReturnValue(selectChain as any);
      eqMock.mockReturnValue({} as any);

      await expect(UserRepository.getUserById(userData.id)).rejects.toThrow(
        "Query error"
      );
    });
  });

  describe("deleteUser", () => {
    it("should delete a user", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const deleteChain = setupDeleteChain();

      dbMock.delete.mockReturnValue(deleteChain as any);
      eqMock.mockReturnValue({} as any);

      await expect(UserRepository.deleteUser(userData.id)).resolves.not.toThrow();
      expect(dbMock.delete).toHaveBeenCalled();
    });

    it("should handle deleting non-existent user gracefully", async () => {
      const fakeId = `user_fake_${Math.random()}` as TUserId;
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const deleteChain = setupDeleteChain();

      dbMock.delete.mockReturnValue(deleteChain as any);
      eqMock.mockReturnValue({} as any);

      await expect(UserRepository.deleteUser(fakeId)).resolves.not.toThrow();
    });

    it("should handle database errors during deletion", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);

      const deleteChain = {
        where: vi.fn().mockRejectedValue(new Error("Delete error")),
      };

      dbMock.delete.mockReturnValue(deleteChain as any);
      eqMock.mockReturnValue({} as any);

      await expect(UserRepository.deleteUser(userData.id)).rejects.toThrow(
        "Delete error"
      );
    });
  });

  describe("updateUser", () => {
    it("should update user data", async () => {
      const userData = createMockUser();
      const updatedData = {
        ...userData,
        name: "Updated Name",
        updatedAt: new Date(),
      };

      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const updateChain = setupUpdateChain([updatedData]);

      dbMock.update.mockReturnValue(updateChain as any);
      eqMock.mockReturnValue({} as any);

      const result = await UserRepository.updateUser(updatedData);

      expect(result).toEqual(updatedData);
      expect(result.name).toBe("Updated Name");
    });

    it("should update multiple fields", async () => {
      const userData = createMockUser();
      const updatedData = {
        ...userData,
        name: "New Name",
        email: "newemail@example.com",
        emailVerified: true,
        updatedAt: new Date(),
      };

      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const updateChain = setupUpdateChain([updatedData]);

      dbMock.update.mockReturnValue(updateChain as any);
      eqMock.mockReturnValue({} as any);

      const result = await UserRepository.updateUser(updatedData);

      expect(result.name).toBe("New Name");
      expect(result.email).toBe("newemail@example.com");
      expect(result.emailVerified).toBe(true);
    });

    it("should return original data if update returns no result", async () => {
      const userData = createMockUser();

      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const updateChain = setupUpdateChain([]); // Empty result

      dbMock.update.mockReturnValue(updateChain as any);
      eqMock.mockReturnValue({} as any);

      const result = await UserRepository.updateUser(userData);

      expect(result).toEqual(userData);
    });

    it("should handle database errors during update", async () => {
      const userData = createMockUser();

      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);

      const updateChain = {
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error("Update error")),
          }),
        }),
      };

      dbMock.update.mockReturnValue(updateChain as any);
      eqMock.mockReturnValue({} as any);

      await expect(UserRepository.updateUser(userData)).rejects.toThrow(
        "Update error"
      );
    });

    it("should preserve user id when updating", async () => {
      const userData = createMockUser();
      const originalId = userData.id;
      const updatedData = {
        ...userData,
        name: "Updated",
        updatedAt: new Date(),
      };

      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);
      const updateChain = setupUpdateChain([updatedData]);

      dbMock.update.mockReturnValue(updateChain as any);
      eqMock.mockReturnValue({} as any);

      const result = await UserRepository.updateUser(updatedData);

      expect(result.id).toBe(originalId);
    });
  });

  describe("Singleton pattern", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = UserRepository;
      const instance2 = UserRepository;

      expect(instance1).toBe(instance2);
    });
  });

  describe("Error handling with tryCatch wrapper", () => {
    it("should properly wrap errors in tryCatch for createUser", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);

      const insertChain = {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        }),
      };

      dbMock.insert.mockReturnValue(insertChain as any);

      await expect(UserRepository.createUser(userData)).rejects.toThrow(
        "Database connection failed"
      );
    });

    it("should properly wrap errors in tryCatch for getUserByEmail", async () => {
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);

      const selectChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Connection timeout")),
        }),
      };

      dbMock.select.mockReturnValue(selectChain as any);
      eqMock.mockReturnValue({} as any);

      await expect(UserRepository.getUserByEmail("test@example.com")).rejects.toThrow(
        "Connection timeout"
      );
    });

    it("should properly wrap errors in tryCatch for deleteUser", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);

      const deleteChain = {
        where: vi.fn().mockRejectedValue(new Error("Permission denied")),
      };

      dbMock.delete.mockReturnValue(deleteChain as any);
      eqMock.mockReturnValue({} as any);

      await expect(UserRepository.deleteUser(userData.id)).rejects.toThrow(
        "Permission denied"
      );
    });
  });

  describe("Database operation call verification", () => {
    it("should call database insert with correct chain methods", async () => {
      const userData = createMockUser();
      const dbMock = vi.mocked(dbClient.db);

      const returningMock = vi.fn().mockResolvedValue([userData]);
      const valuesMock = vi.fn().mockReturnValue({
        returning: returningMock,
      });
      const insertMock = vi.fn().mockReturnValue({
        values: valuesMock,
      });

      dbMock.insert.mockImplementation(insertMock);

      await UserRepository.createUser(userData);

      expect(insertMock).toHaveBeenCalled();
      const expectedInsertData = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        emailVerified: userData.emailVerified,
        image: userData.image,
      };
      expect(valuesMock).toHaveBeenCalledWith(expectedInsertData);
      expect(returningMock).toHaveBeenCalled();
    });

    it("should call database select with where clause for getUserByEmail", async () => {
      const userData = createMockUser({ email: "specific@example.com" });
      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);

      const selectChain = setupSelectChain([userData]);
      dbMock.select.mockImplementation(() => selectChain as any);
      eqMock.mockReturnValue({} as any);

      await UserRepository.getUserByEmail("specific@example.com");

      expect(dbMock.select).toHaveBeenCalled();
      expect(selectChain.from).toHaveBeenCalled();
    });

    it("should call database update with correct fields", async () => {
      const userData = createMockUser();
      const updatedData = {
        ...userData,
        name: "Updated Name",
        updatedAt: new Date(),
      };

      const dbMock = vi.mocked(dbClient.db);
      const eqMock = vi.mocked(eq);

      const updateChain = setupUpdateChain([updatedData]);
      dbMock.update.mockImplementation(() => updateChain as any);
      eqMock.mockReturnValue({} as any);

      await UserRepository.updateUser(updatedData);

      expect(dbMock.update).toHaveBeenCalled();
      const expectedSetData = {
        email: updatedData.email,
        name: updatedData.name,
        emailVerified: updatedData.emailVerified,
        image: updatedData.image,
        updatedAt: updatedData.updatedAt,
      };
      expect(updateChain.set).toHaveBeenCalledWith(expectedSetData);
    });
  });
});
