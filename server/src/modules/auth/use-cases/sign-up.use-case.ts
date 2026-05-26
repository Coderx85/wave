/**
 * Sign Up Use Case
 * 
 * Application business rule: Register a new user
 * 
 * - No HTTP details, no database details
 * - Pure business logic that can be unit tested
 * - Depends only on domain entities and interfaces (ports)
 * - Never imports from adapters or infrastructure
 */

import { User } from "../domain/entities/user";
import { Email } from "../domain/value-objects/email";
import { Password } from "../domain/value-objects/password";
import type { IUserRepository } from "../domain/interfaces/user-repository.interface";
import type { SignUpRequest, SignUpResponse } from "./dto/sign-up.dto";
import { randomUUID } from "crypto";

export interface IPasswordHasher {
  hash(plaintext: string): Promise<string>;
}

export class SignUpUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordHasher: IPasswordHasher
  ) {}

  /**
   * Execute the sign-up business logic
   */
  async execute(request: SignUpRequest): Promise<SignUpResponse> {
    try {
      // Validate input
      if (!request.email || !request.password || !request.name) {
        return {
          success: false,
          error: "Email, password, and name are required",
        };
      }

      // Business rule: Email must be unique
      const emailExists = await this.userRepository.emailExists(request.email);
      if (emailExists) {
        return {
          success: false,
          error: "Email already registered",
        };
      }

      // Create password hash
      const passwordHash = await this.passwordHasher.hash(request.password);

      // Create user entity
      const user = User.create(randomUUID(), request.email, request.name, passwordHash);

      // Persist user
      const savedUser = await this.userRepository.save(user);

      return {
        success: true,
        userId: savedUser.id,
        email: savedUser.email.value,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: message,
      };
    }
  }
}
