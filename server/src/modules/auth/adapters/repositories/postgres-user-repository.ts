import { Pool } from "pg";
import { User } from "../../domain/entities/user";
import type { IUserRepository } from "../../domain/interfaces/user-repository.interface";
import { tryCatch } from "@/lib/try-catch-wrapper";
import { db } from "@/modules/database/client";
import { users } from "@/modules/database/schema/user.repository";
import { eq } from "drizzle-orm";
import type { TUserId } from "@/types";

export class PostgresUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  async findById(id: TUserId): Promise<User | null> {
    return await tryCatch({
      ctx: async () => {
        const [result] = await db.select().from(users).where(eq(users.id, id));
        return result ? this.toEntity(result) : null;
      }
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await tryCatch({
      ctx: async () => {
        const result = await this.pool.query(
          'SELECT * FROM "user" WHERE email = $1',
          [email.toLowerCase()]
        );
        return result.rows.length > 0 ? this.toEntity(result.rows[0]) : null;
      }
    });
  }

  async save(user: User): Promise<User> {
    return await tryCatch({
      ctx: async () => {
        // Check if email exists
        const existing = await this.pool.query(
          'SELECT id FROM "user" WHERE email = $1',
          [user.email.value]
        );

        if (existing.rows.length > 0) {
          throw new Error("Email already registered");
        }

        // Insert user - note: Better Auth may already have created tables
        // We're working with its schema
        const result = await this.pool.query(
          `INSERT INTO "user" (id, email, name, "emailVerified", "passwordHash", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            user.id,
            user.email.value,
            user.name,
            user.emailVerified,
            user.passwordHash.hash,
            user.createdAt,
            user.updatedAt,
          ]
        );

        return this.toEntity(result.rows[0]);
      }
    }); 
  }

  async update(user: User): Promise<User> {
    return await tryCatch({
      ctx: async () => {
        const result = await this.pool.query(
          `UPDATE "user"
           SET email = $2, name = $3, "emailVerified" = $4, "updatedAt" = $5
           WHERE id = $1
           RETURNING *`,
          [user.id, user.email.value, user.name, user.emailVerified, new Date()]
      );

      return this.toEntity(result.rows[0]); 
    }
    });
  }

  async emailExists(email: string): Promise<boolean> {
    return await tryCatch({
      ctx: async () => {
        const result = await this.pool.query(
          'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
          [email.toLowerCase()]
        );
        return result.rows.length > 0;
      }
    });
  }

  async delete(id: string): Promise<boolean> {
    return await tryCatch({
      ctx: async () => {
        const result = await this.pool.query(
          'DELETE FROM "user" WHERE id = $1',
          [id]
        );
        return result.rowCount! > 0;
      }
    });
  }

  private toEntity(row: any): User {
    return User.fromDatabase({
      id: row.id,
      email: row.email,
      name: row.name,
      passwordHash: row.passwordHash,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isActive: row.isActive ?? true,
      emailVerified: row.emailVerified ?? false,
    });
  }
}
