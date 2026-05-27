import type { TUserId } from "@/types";
import type { IUserStore, IUser, IUserDBDTO } from "../user.interface";
import { db } from "../../database/client"; 
import { eq } from "drizzle-orm";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { users } from "../../database/schema/user.repository";

class UserStore implements IUserStore {
  private static instance: UserStore;

  private constructor() {}

  public static getInstance(): UserStore {
    if (!UserStore.instance) {
      UserStore.instance = new UserStore();
    } 
    return UserStore.instance;
  };

  async createUser(data: IUserDBDTO): Promise<IUserDBDTO> {
    return tryCatch({  
    ctx: async () => {
      const [createdUser] = await db
        .insert(users)
        .values({
          id: data.id,
          email: data.email,
          name: data.name,
          emailVerified: data.emailVerified,
          image: data.image,
        })
        .returning();

      // If the user was not created, throw an error
      if (!createdUser) {
        throw new Error("Failed to create user");
      }

      return {
        ...createdUser,
      } as IUserDBDTO;
      }
    });
  };
  
  async getUserByEmail(email: string): Promise<IUserDBDTO | null> {
    return tryCatch({
      ctx: async () => {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user) return null;
        return user as IUserDBDTO;
      }
    });
  };

  async getUserById(id: TUserId): Promise<IUserDBDTO | null> {
    return tryCatch({
      ctx: async () => {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        if (!user) return null;
        return user as IUserDBDTO;
      }
    });
  };

  async deleteUser(id: TUserId): Promise<void> {
    return tryCatch({
      ctx: async () => {
        await db.delete(users).where(eq(users.id, id));
      }
    });
  };

  async updateUser(data: IUserDBDTO): Promise<IUserDBDTO> {
    return tryCatch({
      ctx: async () => {
        const [updatedUser] = await db
          .update(users)
          .set({
            email: data.email,
            name: data.name,
            emailVerified: data.emailVerified,
            image: data.image,
            updatedAt: data.updatedAt,
          })
          .where(eq(users.id, data.id)).returning();
        
        // If nothing was updated, return the original data
        if (!updatedUser) {
          return data;
        }
        return {
          ...updatedUser,
        } as IUserDBDTO;
      }
    });
  };
};

export const UserRepository = UserStore.getInstance();
