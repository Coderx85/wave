/**
 * Auth Module Public API
 * 
 * Only export what other modules need.
 * Internal implementation details stay private.
 */

// Domain
export { User } from "./domain/entities/user";
export { Email } from "./domain/value-objects/email";
export { Password } from "./domain/value-objects/password";
export type { IUserRepository } from "./domain/interfaces/user-repository.interface";

// Use Cases
export { SignUpUseCase } from "./use-cases/sign-up.use-case";
export { SignInUseCase } from "./use-cases/sign-in.use-case";
export type { IPasswordHasher } from "./use-cases/sign-up.use-case";
export type { IPasswordVerifier, ISessionFactory } from "./use-cases/sign-in.use-case";

// Adapters - Repositories
export { PostgresUserRepository } from "./adapters/repositories/postgres-user-repository";
export { InMemoryUserRepository } from "./adapters/repositories/in-memory-user-repository";

// Adapters - Password
export {
  MockPasswordHasher,
  MockPasswordVerifier,
  NullPasswordHasher,
  NullPasswordVerifier,
} from "./adapters/password-adapters";

// Adapters - Controllers
export { AuthController, registerAuthRoutes } from "./adapters/controllers/auth.controller";

// DTOs
export type { SignUpRequest, SignUpResponse } from "./use-cases/dto/sign-up.dto";
export type { SignInRequest, SignInResponse } from "./use-cases/dto/sign-in.dto";
