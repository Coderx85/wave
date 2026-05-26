/**
 * User Repository Interface (Port)
 * 
 * Defines the contract for user persistence.
 * No implementation details - abstract interface only.
 * Concrete implementations (PostgreSQL, In-Memory, etc.) are in adapters/
 */

import { User } from "../entities/user";

export interface IUserRepository {
  /**
   * Find a user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find a user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Save a new user (insert)
   * Throws if email already exists
   */
  save(user: User): Promise<User>;

  /**
   * Update an existing user
   */
  update(user: User): Promise<User>;

  /**
   * Check if email is already registered
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Delete a user
   */
  delete(id: string): Promise<boolean>;
}
