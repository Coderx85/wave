/**
 * PostgreSQL User Repository Adapter
 * 
 * Implements IUserRepository using the PostgreSQL database.
 * Uses the Better Auth database instance configured in lib/auth.ts
 * 
 * This adapter is swappable - tests use InMemoryUserRepository,
 * production uses PostgresUserRepository. Use cases don't care which.
 */

import { Pool } from "pg";
import { User } from "../../domain/entities/user";
import type { IUserRepository } from "../../domain/interfaces/user-repository.interface";

export class PostgresUserRepository implements IUserRepository {
  constructor(private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    try {
      const result = await this.pool.query(
        "SELECT * FROM \"user\" WHERE id = $1",
        [id]
      );
      return result.rows.length > 0 ? this.toEntity(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find user by ID: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM "user" WHERE email = $1',
        [email.toLowerCase()]
      );
      return result.rows.length > 0 ? this.toEntity(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find user by email: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async save(user: User): Promise<User> {
    try {
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
    } catch (error) {
      throw new Error(`Failed to save user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async update(user: User): Promise<User> {
    try {
      const result = await this.pool.query(
        `UPDATE "user"
         SET email = $2, name = $3, "emailVerified" = $4, "updatedAt" = $5
         WHERE id = $1
         RETURNING *`,
        [user.id, user.email.value, user.name, user.emailVerified, new Date()]
      );

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      return this.toEntity(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async emailExists(email: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT id FROM "user" WHERE email = $1 LIMIT 1',
        [email.toLowerCase()]
      );
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Failed to check email existence: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'DELETE FROM "user" WHERE id = $1',
        [id]
      );
      return result.rowCount! > 0;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : String(error)}`);
    }
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
