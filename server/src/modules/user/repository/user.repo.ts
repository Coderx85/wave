import type { TUserId } from "@/types";
import type { IUserStore, IUserDBDTO } from "./user-repo.interface";
import { db as defaultDb } from "../../database/client";
import { eq } from "drizzle-orm";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { users } from "../../database/schema/user.repository";
import { CacheFactory, type ICacheStore } from "@/lib/cache";

class UserStore implements IUserStore {
  private cache: ICacheStore;
  private db: typeof defaultDb;

  constructor(cacheStore?: ICacheStore, dbInstance?: typeof defaultDb) {
    this.cache = cacheStore ?? CacheFactory.create();
    this.db = dbInstance ?? defaultDb;
  }

  private getUserByIdCacheKey(id: TUserId): string {
    return `user-by-id:${id}`;
  }

  private getUserByEmailCacheKey(email: string): string {
    return `user-by-email:${email}`;
  }

  async createUser(data: IUserDBDTO): Promise<IUserDBDTO> {
    const createdUser = await tryCatch({
      ctx: async () => {
        const [result] = await this.db
          .insert(users)
          .values({
            id: data.id,
            email: data.email,
            name: data.name,
            emailVerified: data.emailVerified,
            image: data.image,
          })
          .returning();

        if (!result) {
          throw new Error("Failed to create user");
        }
        return result as IUserDBDTO;
      }
    });

    await this.cache.del(this.getUserByEmailCacheKey(createdUser.email));
    await this.cache.del(this.getUserByIdCacheKey(createdUser.id));
    return createdUser;
  };

  getUserByEmail(email: string): Promise<IUserDBDTO | null> {
    return this.cache.getOrSet(this.getUserByEmailCacheKey(email), () => {
        return tryCatch({
            ctx: async () => {
              const [user] = await this.db.select().from(users).where(eq(users.email, email));
              if (!user) return null;
              return user as IUserDBDTO;
            }
          });
    }, 3600);
  };

  getUserById(id: TUserId): Promise<IUserDBDTO | null> {
    return this.cache.getOrSet(this.getUserByIdCacheKey(id), () => {
        return tryCatch({
            ctx: async () => {
              const [user] = await this.db.select().from(users).where(eq(users.id, id));
              if (!user) return null;
              return user as IUserDBDTO;
            }
          });
    }, 3600);
  };

  async deleteUser(id: TUserId): Promise<void> {
    const user = await this.getUserById(id);
    await tryCatch({
      ctx: async () => {
        await this.db.delete(users).where(eq(users.id, id));
      }
    });
    if (user) {
        await this.cache.del(this.getUserByIdCacheKey(id));
        await this.cache.del(this.getUserByEmailCacheKey(user.email));
    }
  };

  async updateUser(data: IUserDBDTO): Promise<IUserDBDTO> {
    const updatedUser = await tryCatch({
      ctx: async () => {
        const [result] = await this.db
          .update(users)
          .set({
            email: data.email,
            name: data.name,
            emailVerified: data.emailVerified,
            image: data.image,
            updatedAt: data.updatedAt,
          })
          .where(eq(users.id, data.id)).returning();

        if (!result) {
          return data;
        }
        return result as IUserDBDTO;
      }
    });

    await this.cache.del(this.getUserByIdCacheKey(updatedUser.id));
    await this.cache.del(this.getUserByEmailCacheKey(updatedUser.email));

    return updatedUser;
  };
};

export const UserRepository = new UserStore();
