import { describe, it, expect, beforeEach } from "vitest";
import { UserRepository } from "./user.repo";
import type { IUserDBDTO } from "../user.interface";
import type { TUserId } from "@/types";

describe("UserStore (Repository)", () => {
  beforeEach(() => {
    // Reset the users array by creating a new instance
    // Note: Since UserStore is a singleton, we need to manually clear the state
    // This is a limitation of the current design - ideally we'd have better test isolation
  });

  const createMockUser = (overrides?: Partial<IUserDBDTO>): IUserDBDTO => ({
    id: `user_${Math.random()}` as TUserId,
    email: "test@example.com",
    name: "Test User",
    password: "hashedPassword123",
    createdAt: new Date(),
    updatedAt: null,
    emailVerified: false,
    ...overrides,
  });

  describe("createUser", () => {
    it("should create a new user", async () => {
      const userData = createMockUser();
      const result = await UserRepository.createUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.emailVerified).toBe(false);
    });

    it("should preserve user data when creating", async () => {
      const userData = createMockUser({
        email: "specific@example.com",
        name: "Specific User",
      });

      const result = await UserRepository.createUser(userData);

      expect(result.email).toBe("specific@example.com");
      expect(result.name).toBe("Specific User");
    });

    it("should set emailVerified to false by default", async () => {
      const userData = createMockUser();
      const result = await UserRepository.createUser(userData);

      expect(result.emailVerified).toBe(false);
    });
  });

  describe("getUserByEmail", () => {
    it("should find user by email", async () => {
      const userData = createMockUser({ email: "findme@example.com" });
      await UserRepository.createUser(userData);

      const result = await UserRepository.getUserByEmail("findme@example.com");

      expect(result).toBeDefined();
      expect(result?.email).toBe("findme@example.com");
    });

    it("should return null if user not found by email", async () => {
      const result = await UserRepository.getUserByEmail("notfound@example.com");

      expect(result).toBeNull();
    });

    it("should find the correct user when multiple users exist", async () => {
      const user1 = createMockUser({ email: "user1@example.com" });
      const user2 = createMockUser({ email: "user2@example.com" });

      await UserRepository.createUser(user1);
      await UserRepository.createUser(user2);

      const result = await UserRepository.getUserByEmail("user2@example.com");

      expect(result?.email).toBe("user2@example.com");
      expect(result?.id).toBe(user2.id);
    });
  });

  describe("getUserById", () => {
    it("should find user by id", async () => {
      const userData = createMockUser();
      await UserRepository.createUser(userData);

      const result = await UserRepository.getUserById(userData.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(userData.id);
    });

    it("should return null if user not found by id", async () => {
      const fakeId = `user_fake_${Math.random()}` as TUserId;
      const result = await UserRepository.getUserById(fakeId);

      expect(result).toBeNull();
    });

    it("should find the correct user when multiple users exist", async () => {
      const user1 = createMockUser();
      const user2 = createMockUser();

      await UserRepository.createUser(user1);
      await UserRepository.createUser(user2);

      const result = await UserRepository.getUserById(user1.id);

      expect(result?.id).toBe(user1.id);
      expect(result?.email).toBe(user1.email);
    });
  });

  describe("deleteUser", () => {
    it("should delete a user", async () => {
      const userData = createMockUser();
      await UserRepository.createUser(userData);

      await UserRepository.deleteUser(userData.id);

      const result = await UserRepository.getUserById(userData.id);
      expect(result).toBeNull();
    });

    it("should handle deleting non-existent user gracefully", async () => {
      const fakeId = `user_fake_${Math.random()}` as TUserId;

      // Should not throw
      await expect(UserRepository.deleteUser(fakeId)).resolves.not.toThrow();
    });

    it("should not affect other users when deleting", async () => {
      const user1 = createMockUser();
      const user2 = createMockUser();

      await UserRepository.createUser(user1);
      await UserRepository.createUser(user2);

      await UserRepository.deleteUser(user1.id);

      const result = await UserRepository.getUserById(user2.id);
      expect(result).toBeDefined();
      expect(result?.id).toBe(user2.id);
    });
  });

  describe("updateUser", () => {
    it("should update user data", async () => {
      const userData = createMockUser();
      await UserRepository.createUser(userData);

      const updatedData = {
        ...userData,
        name: "Updated Name",
        updatedAt: new Date(),
      };

      const result = await UserRepository.updateUser(updatedData);

      expect(result.name).toBe("Updated Name");
      expect(result.updatedAt).toBeDefined();
    });

    it("should update multiple fields", async () => {
      const userData = createMockUser();
      await UserRepository.createUser(userData);

      const updatedData = {
        ...userData,
        name: "New Name",
        email: "newemail@example.com",
        emailVerified: true,
        updatedAt: new Date(),
      };

      const result = await UserRepository.updateUser(updatedData);

      expect(result.name).toBe("New Name");
      expect(result.email).toBe("newemail@example.com");
      expect(result.emailVerified).toBe(true);
    });

    it("should update imageUrl", async () => {
      const userData = createMockUser();
      await UserRepository.createUser(userData);

      const updatedData = {
        ...userData,
        imageUrl: "/uploads/pic.jpg",
        updatedAt: new Date(),
      };

      const result = await UserRepository.updateUser(updatedData);

      expect(result.imageUrl).toBe("/uploads/pic.jpg");
    });

    it("should preserve createdAt when updating", async () => {
      const createdAt = new Date("2024-01-01");
      const userData = createMockUser({ createdAt });
      await UserRepository.createUser(userData);

      const updatedData = {
        ...userData,
        name: "Updated",
        updatedAt: new Date(),
      };

      const result = await UserRepository.updateUser(updatedData);

      expect(result.createdAt).toEqual(createdAt);
    });

    it("should return updated user for non-existent user", async () => {
      const userData = createMockUser();
      const result = await UserRepository.updateUser(userData);

      // Since the user doesn't exist, it should return the provided data
      expect(result).toBeDefined();
    });

    it("should not affect other users when updating", async () => {
      const user1 = createMockUser({ name: "User 1" });
      const user2 = createMockUser({ name: "User 2" });

      await UserRepository.createUser(user1);
      await UserRepository.createUser(user2);

      const updatedUser1 = {
        ...user1,
        name: "Updated User 1",
        updatedAt: new Date(),
      };

      await UserRepository.updateUser(updatedUser1);

      const result = await UserRepository.getUserById(user2.id);
      expect(result?.name).toBe("User 2");
    });
  });

  describe("Integration tests", () => {
    it("should perform CRUD operations in sequence", async () => {
      const userData = createMockUser({ email: "crud@example.com", name: "CRUD User" });

      // Create
      const created = await UserRepository.createUser(userData);
      expect(created).toBeDefined();

      // Read by email
      let found = await UserRepository.getUserByEmail("crud@example.com");
      expect(found).toBeDefined();

      // Update
      const updated = await UserRepository.updateUser({
        ...userData,
        name: "Updated CRUD User",
        updatedAt: new Date(),
      });
      expect(updated.name).toBe("Updated CRUD User");

      // Read again to verify update
      found = await UserRepository.getUserById(userData.id);
      expect(found?.name).toBe("Updated CRUD User");

      // Delete
      await UserRepository.deleteUser(userData.id);
      found = await UserRepository.getUserById(userData.id);
      expect(found).toBeNull();
    });

    it("should maintain data integrity with concurrent operations", async () => {
      const users = [
        createMockUser({ email: "concurrent1@example.com" }),
        createMockUser({ email: "concurrent2@example.com" }),
        createMockUser({ email: "concurrent3@example.com" }),
      ];

      await Promise.all(users.map(u => UserRepository.createUser(u)));

      const results = await Promise.all(
        users.map(u => UserRepository.getUserByEmail(u.email))
      );

      expect(results).toHaveLength(3);
      expect(results.every(r => r !== null)).toBe(true);
    });
  });
});
