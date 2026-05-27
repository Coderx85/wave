import type { TUserId } from "@/types";
import type { IUserStore, IUser, IUserDBDTO } from "../user.interface";

// TODO: Replace with actual database implementation.
const users: IUserDBDTO[] = [];

class UserStore implements IUserStore {
  private static instance: UserStore;

  private constructor() {}

  public static getInstance(): UserStore {
    if (!UserStore.instance) {
      UserStore.instance = new UserStore();
    } 
    return UserStore.instance;
  };

  async createUser(data: IUser): Promise<IUserDBDTO> {
    const newUser: IUser = {
      ...data,  
    };

    users.push({
      ...newUser,
      emailVerified: false,
    });
    return Promise.resolve({
      ...newUser,
      emailVerified: false,
    });
  };
  
  async getUserByEmail(email: string): Promise<IUserDBDTO | null> {
    const user = users.find(u => u.email === email);
    return Promise.resolve(user || null);
  };

  async getUserById(id: TUserId): Promise<IUserDBDTO | null> {
    const user = users.find(u => u.id === id);
    return Promise.resolve(user || null);
  };

  async deleteUser(id: TUserId): Promise<void> {
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      users.splice(userIndex, 1);
    }
    
    return Promise.resolve();
  };

  async updateUser(data: IUserDBDTO): Promise<IUserDBDTO> {
    const userIndex = users.findIndex(u => u.id === data.id);
    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...data, updatedAt: new Date() };
    }
    return Promise.resolve(users[userIndex] || data);
  };
};

export const UserRepository = UserStore.getInstance();