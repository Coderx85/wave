import type { IUserModule, IUserStore, IUser, IUserDBDTO } from "./user.interface";
import type { TUserId } from "@/types";
import { ID } from "@/lib/ID";

export class UserModule implements IUserModule {
  constructor(private userStore: IUserStore) {}

  async createUser(email: string, name: string, password: string): Promise<IUser> {
    const userId = ID.UserId();
    const newUser: IUserDBDTO = {
      id: userId,
      email,
      name,
      createdAt: new Date(),
      updatedAt: null,
      emailVerified: false,
      image: null,
    };
    // TODO: Handle password hashing and storage in auth module
    return this.userStore.createUser(newUser);
  }

  async queryUser(query: { queryByEmail: string } | { queryById: TUserId }): Promise<IUser> {
    if ("queryByEmail" in query) {
      const user = await this.userStore.getUserByEmail(query.queryByEmail);
      if (!user) {
        throw new Error(`User not found with email: ${query.queryByEmail}`);
      }
      return user;
    }

    const user = await this.userStore.getUserById(query.queryById);
    if (!user) {
      throw new Error(`User not found with id: ${query.queryById}`);
    }
    return user;
  }

  async deleteUser(id: TUserId): Promise<void> {
    await this.userStore.deleteUser(id);
  }

  async verifyUserEmail(email: IUser["email"]): Promise<IUser> {
    const user = await this.userStore.getUserByEmail(email);
    if (!user) {
      throw new Error(`User not found with email: ${email}`);
    }
    
    const updatedUser = await this.userStore.updateUser({
      ...user,
      emailVerified: true,
      updatedAt: new Date(),
    });
    return updatedUser;
  }

  async uploadProfilePicture(userId: TUserId, file: Buffer, filename: string): Promise<string> {
    // TODO: Implement actual file upload logic
    // For now, return a mock URL
    const imageUrl = `/uploads/${userId}/${filename}`;
    
    const user = await this.userStore.getUserById(userId);
    if (!user) {
      throw new Error(`User not found with id: ${userId}`);
    }

    await this.userStore.updateUser({
      ...user,
      image: imageUrl,
      updatedAt: new Date(),
    });

    return imageUrl;
  }

  async updateUser(id: TUserId, updates: Partial<Omit<IUser, "id" | "createdAt" | "updatedAt">>): Promise<IUser> {
    const user = await this.userStore.getUserById(id);
    if (!user) {
      throw new Error(`User not found with id: ${id}`);
    }

    const updatedUser = await this.userStore.updateUser({
      ...user,
      ...updates,
      updatedAt: new Date(),
    });
    return updatedUser;
  }
}
