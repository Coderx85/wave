/**
 * Sign In Use Case
 * 
 * Application business rule: Authenticate a user
 * 
 * - No HTTP details, no database details
 * - Pure business logic that can be unit tested
 * - Depends only on domain entities and interfaces (ports)
 * - Never imports from adapters or infrastructure
 */

import type { IUserRepository } from "../domain/interfaces/user-repository.interface";
import type { SignInRequest, SignInResponse } from "./dto/sign-in.dto";

export interface IPasswordVerifier {
  verify(plaintext: string, hash: string): Promise<boolean>;
}

export interface ISessionFactory {
  create(userId: string): Promise<string>;
}

export class SignInUseCase {
  constructor(
    private userRepository: IUserRepository,
    private passwordVerifier: IPasswordVerifier,
    private sessionFactory: ISessionFactory
  ) {}

  /**
   * Execute the sign-in business logic
   */
  async execute(request: SignInRequest): Promise<SignInResponse> {
    try {
      // Validate input
      if (!request.email || !request.password) {
        return {
          success: false,
          error: "Email and password are required",
        };
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(request.email);
      if (!user) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }

      // Business rule: User must be active
      if (!user.canAuthenticate()) {
        return {
          success: false,
          error: "Account is not active",
        };
      }

      // Verify password
      const passwordValid = await this.passwordVerifier.verify(
        request.password,
        user.passwordHash.hash
      );
      if (!passwordValid) {
        return {
          success: false,
          error: "Invalid email or password",
        };
      }

      // Create session
      const sessionToken = await this.sessionFactory.create(user.id);

      return {
        success: true,
        userId: user.id,
        email: user.email.value,
        sessionToken,
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
