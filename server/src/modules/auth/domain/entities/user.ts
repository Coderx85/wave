/**
 * User Entity
 * 
 * Core domain entity representing an authenticated user.
 * Contains business logic for user state and behavior.
 * Pure TypeScript - no framework dependencies.
 */

import { Email } from "../value-objects/email";
import { Password } from "../value-objects/password";

export class User {
  readonly id: string;
  readonly email: Email;
  readonly name: string;
  readonly passwordHash: Password;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly isActive: boolean;
  readonly emailVerified: boolean;

  constructor(
    id: string,
    email: Email,
    name: string,
    passwordHash: Password,
    createdAt: Date,
    updatedAt: Date,
    isActive: boolean = true,
    emailVerified: boolean = false
  ) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.passwordHash = passwordHash;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.isActive = isActive;
    this.emailVerified = emailVerified;
  }

  /**
   * Business rule: User can only authenticate if active
   */
  canAuthenticate(): boolean {
    return this.isActive;
  }

  /**
   * Business rule: User can only perform actions if active and verified
   */
  isFullyVerified(): boolean {
    return this.isActive && this.emailVerified;
  }

  /**
   * Create a new user (aggregate constructor)
   * Use this factory method to create valid new users
   */
  static create(
    id: string,
    email: string,
    name: string,
    passwordHash: string
  ): User {
    return new User(
      id,
      new Email(email),
      name,
      new Password(passwordHash),
      new Date(),
      new Date(),
      true,
      false
    );
  }

  /**
   * Reconstruct user from persistence layer
   * Used by repositories after database queries
   */
  static fromDatabase(data: {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    emailVerified: boolean;
  }): User {
    return new User(
      data.id,
      new Email(data.email),
      data.name,
      new Password(data.passwordHash),
      data.createdAt,
      data.updatedAt,
      data.isActive,
      data.emailVerified
    );
  }

  /**
   * Convert to plain object for serialization
   * Excludes sensitive information like password hash
   */
  toPlainObject() {
    return {
      id: this.id,
      email: this.email.value,
      name: this.name,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
    };
  }
}
