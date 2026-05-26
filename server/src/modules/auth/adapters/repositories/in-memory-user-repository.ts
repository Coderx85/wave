/**
 * In-Memory User Repository (Test Adapter)
 * 
 * Implements IUserRepository using a simple Map.
 * Used for unit testing - no database, no network, no external dependencies.
 * 
 * This is the hallmark of Clean Architecture:
 * Use cases can be tested fully with just this in-memory adapter.
 */

import { User } from "../../domain/entities/user";
import type { IUserRepository } from "../../domain/interfaces/user-repository.interface";

export class InMemoryUserRepository implements IUserRepository {
  private store: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const id = this.emailIndex.get(email.toLowerCase());
    if (!id) return null;
    return this.store.get(id) ?? null;
  }

  async save(user: User): Promise<User> {
    // Check for duplicate email
    if (this.emailIndex.has(user.email.value)) {
      throw new Error("Email already exists");
    }

    // Store user
    this.store.set(user.id, user);
    this.emailIndex.set(user.email.value, user.id);

    return user;
  }

  async update(user: User): Promise<User> {
    if (!this.store.has(user.id)) {
      throw new Error("User not found");
    }

    this.store.set(user.id, user);
    return user;
  }

  async emailExists(email: string): Promise<boolean> {
    return this.emailIndex.has(email.toLowerCase());
  }

  async delete(id: string): Promise<boolean> {
    const user = this.store.get(id);
    if (!user) return false;

    this.store.delete(id);
    this.emailIndex.delete(user.email.value);
    return true;
  }

  /**
   * Test helper: Get all stored users (never do this in production)
   */
  getAllUsers(): User[] {
    return Array.from(this.store.values());
  }

  /**
   * Test helper: Clear all data
   */
  clear(): void {
    this.store.clear();
    this.emailIndex.clear();
  }
}
