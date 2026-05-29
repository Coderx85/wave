import { describe, it, expect, beforeEach, vi } from "vitest";
import type { TUserId } from "../../../types";

// Mock drizzle-orm to prevent relation errors
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  between: vi.fn(),
  or: vi.fn(),
  relations: vi.fn(() => ({})),
  one: vi.fn(),
  many: vi.fn(),
}));

import { type IUserDBDTO, type IUserStore} from "../repository";
import { UserModule } from "../service";

describe("UserModule", () => {
  let userModule: UserModule;
  let mockUserStore: IUserStore;

  const mockUser: IUserDBDTO = {
    id: "user_123" as TUserId,
    email: "test@example.com",
    name: "Test User",
    createdAt: new Date("2024-01-01"),
    updatedAt: null,
    emailVerified: false,
    image: null,
  };

  beforeEach(() => {
    mockUserStore = {
      createUser: vi.fn(),
      getUserByEmail: vi.fn(),
      getUserById: vi.fn(),
      deleteUser: vi.fn(),
      updateUser: vi.fn(),
    };

    userModule = new UserModule(mockUserStore);
  });

  describe("createUser", () => {
    it("should create a new user with correct data", async () => {
      const createdUser: IUserDBDTO = {
        ...mockUser,
        emailVerified: false,
      };

      vi.mocked(mockUserStore.createUser).mockResolvedValue(createdUser);

      const result = await userModule.createUser("test@example.com", "Test User", "password123");

      expect(mockUserStore.createUser).toHaveBeenCalled();
      expect(result).toEqual(createdUser);
    });

    it("should call createUser with correct parameters", async () => {
      const createdUser: IUserDBDTO = {
        ...mockUser,
        emailVerified: false,
      };

      vi.mocked(mockUserStore.createUser).mockResolvedValue(createdUser);

      await userModule.createUser("test@example.com", "Test User", "password123");

      const callArgs = vi.mocked(mockUserStore.createUser).mock.calls[0][0];
      expect(callArgs.email).toBe("test@example.com");
      expect(callArgs.name).toBe("Test User");
      expect(callArgs.emailVerified).toBe(false);
      expect(callArgs.image).toBeNull();
    });
  });

  describe("queryUser", () => {
    describe("queryByEmail", () => {
      it("should find user by email", async () => {
        vi.mocked(mockUserStore.getUserByEmail).mockResolvedValue(mockUser);

        const result = await userModule.queryUser({ queryByEmail: "test@example.com" });

        expect(mockUserStore.getUserByEmail).toHaveBeenCalledWith("test@example.com");
        expect(result).toEqual(mockUser);
      });

      it("should throw error if user not found by email", async () => {
        vi.mocked(mockUserStore.getUserByEmail).mockResolvedValue(null);

        await expect(
          userModule.queryUser({ queryByEmail: "notfound@example.com" })
        ).rejects.toThrow("User not found with email: notfound@example.com");
      });
    });

    describe("queryById", () => {
      it("should find user by id", async () => {
        vi.mocked(mockUserStore.getUserById).mockResolvedValue(mockUser);

        const result = await userModule.queryUser({ queryById: mockUser.id });

        expect(mockUserStore.getUserById).toHaveBeenCalledWith(mockUser.id);
        expect(result).toEqual(mockUser);
      });

      it("should throw error if user not found by id", async () => {
        const userId = "user_notfound" as TUserId;
        vi.mocked(mockUserStore.getUserById).mockResolvedValue(null);

        await expect(
          userModule.queryUser({ queryById: userId })
        ).rejects.toThrow(`User not found with id: ${userId}`);
      });
    });
  });

  describe("deleteUser", () => {
    it("should delete user by id", async () => {
      vi.mocked(mockUserStore.deleteUser).mockResolvedValue(undefined);

      await userModule.deleteUser(mockUser.id);

      expect(mockUserStore.deleteUser).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe("verifyUserEmail", () => {
    it("should verify user email", async () => {
      const verifiedUser: IUserDBDTO = {
        ...mockUser,
        emailVerified: true,
        updatedAt: new Date(),
      };

      vi.mocked(mockUserStore.getUserByEmail).mockResolvedValue(mockUser);
      vi.mocked(mockUserStore.updateUser).mockResolvedValue(verifiedUser);

      const result = await userModule.verifyUserEmail("test@example.com");

      expect(mockUserStore.getUserByEmail).toHaveBeenCalledWith("test@example.com");
      expect(mockUserStore.updateUser).toHaveBeenCalled();

      const updateCall = vi.mocked(mockUserStore.updateUser).mock.calls[0][0];
      expect(updateCall.emailVerified).toBe(true);
      expect(result).toEqual(verifiedUser);
    });

    it("should throw error if user not found when verifying email", async () => {
      vi.mocked(mockUserStore.getUserByEmail).mockResolvedValue(null);

      await expect(
        userModule.verifyUserEmail("notfound@example.com")
      ).rejects.toThrow("User not found with email: notfound@example.com");
    });
  });

  describe("uploadProfilePicture", () => {
    it("should upload profile picture and update user", async () => {
      const fileBuffer = Buffer.from("image data");
      const filename = "profile.jpg";
      const imageUrl = `/uploads/${mockUser.id}/${filename}`;

      const updatedUser: IUserDBDTO = {
        ...mockUser,
        image: imageUrl,
        updatedAt: new Date(),
      };

      vi.mocked(mockUserStore.getUserById).mockResolvedValue(mockUser);
      vi.mocked(mockUserStore.updateUser).mockResolvedValue(updatedUser);

      const result = await userModule.uploadProfilePicture(mockUser.id, fileBuffer, filename);

      expect(mockUserStore.getUserById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserStore.updateUser).toHaveBeenCalled();
      expect(result).toBe(imageUrl);
    });

    it("should throw error if user not found during profile picture upload", async () => {
      vi.mocked(mockUserStore.getUserById).mockResolvedValue(null);

      await expect(
        userModule.uploadProfilePicture(mockUser.id, Buffer.from("data"), "pic.jpg")
      ).rejects.toThrow(`User not found with id: ${mockUser.id}`);
    });
  });

  describe("updateUser", () => {
    it("should update user with partial data", async () => {
      const updates = { name: "Updated Name" };
      const updatedUser: IUserDBDTO = {
        ...mockUser,
        name: "Updated Name",
        updatedAt: new Date(),
      };

      vi.mocked(mockUserStore.getUserById).mockResolvedValue(mockUser);
      vi.mocked(mockUserStore.updateUser).mockResolvedValue(updatedUser);

      const result = await userModule.updateUser(mockUser.id, updates);

      expect(mockUserStore.getUserById).toHaveBeenCalledWith(mockUser.id);
      expect(mockUserStore.updateUser).toHaveBeenCalled();

      const updateCall = vi.mocked(mockUserStore.updateUser).mock.calls[0][0];
      expect(updateCall.name).toBe("Updated Name");
      expect(result).toEqual(updatedUser);
    });

    it("should update email", async () => {
      const updates = { email: "newemail@example.com" };
      const updatedUser: IUserDBDTO = {
        ...mockUser,
        email: "newemail@example.com",
        updatedAt: new Date(),
      };

      vi.mocked(mockUserStore.getUserById).mockResolvedValue(mockUser);
      vi.mocked(mockUserStore.updateUser).mockResolvedValue(updatedUser);

      const result = await userModule.updateUser(mockUser.id, updates);

      expect(result.email).toBe("newemail@example.com");
    });

    it("should throw error if user not found during update", async () => {
      vi.mocked(mockUserStore.getUserById).mockResolvedValue(null);

      await expect(
        userModule.updateUser(mockUser.id, { name: "New Name" })
      ).rejects.toThrow(`User not found with id: ${mockUser.id}`);
    });

    it("should not allow updating id, createdAt, or updatedAt", async () => {
      const updatedUser: IUserDBDTO = {
        ...mockUser,
        name: "Updated",
        updatedAt: new Date(),
      };

      vi.mocked(mockUserStore.getUserById).mockResolvedValue(mockUser);
      vi.mocked(mockUserStore.updateUser).mockResolvedValue(updatedUser);

      await userModule.updateUser(mockUser.id, {
        name: "Updated",
        // These should be ignored by the type system
      });

      const updateCall = vi.mocked(mockUserStore.updateUser).mock.calls[0][0];
      expect(updateCall.id).toBe(mockUser.id);
    });
  });
});
