/**
 * Auth Module Unit Tests
 * 
 * This is the hallmark of Clean Architecture:
 * - No database (uses InMemoryUserRepository)
 * - No external dependencies
 * - No Docker, no mocking frameworks
 * - Just pure unit tests of business logic
 * - Run in milliseconds
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SignUpUseCase } from "../use-cases/sign-up.use-case";
import { SignInUseCase } from "../use-cases/sign-in.use-case";
import { InMemoryUserRepository } from "../adapters/repositories/in-memory-user-repository";
import {
  MockPasswordHasher,
  MockPasswordVerifier,
  NullPasswordHasher,
} from "../adapters/password-adapters";
import { User } from "../domain/entities/user";
import { Email } from "../domain/value-objects/email";

// Mock Session Factory
class TestSessionFactory {
  async create(userId: string): Promise<string> {
    return `session-${userId}`;
  }
}

describe("Sign Up Use Case", () => {
  let signUpUseCase: SignUpUseCase;
  let repository: InMemoryUserRepository;
  let passwordHasher: MockPasswordHasher;

  beforeEach(() => {
    repository = new InMemoryUserRepository();
    passwordHasher = new MockPasswordHasher();
    signUpUseCase = new SignUpUseCase(repository, passwordHasher);
  });

  it("should successfully register a new user", async () => {
    const response = await signUpUseCase.execute({
      email: "alice@example.com",
      password: "SecurePassword123",
      name: "Alice Smith",
    });

    expect(response.success).toBe(true);
    expect(response.userId).toBeDefined();
    expect(response.email).toBe("alice@example.com");
    expect(response.error).toBeUndefined();
  });

  it("should reject duplicate email", async () => {
    // First registration
    await signUpUseCase.execute({
      email: "bob@example.com",
      password: "SecurePassword123",
      name: "Bob Jones",
    });

    // Second registration with same email
    const response = await signUpUseCase.execute({
      email: "bob@example.com",
      password: "DifferentPassword123",
      name: "Bob Different",
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("already registered");
  });

  it("should reject invalid email", async () => {
    const response = await signUpUseCase.execute({
      email: "not-an-email",
      password: "SecurePassword123",
      name: "Charlie Brown",
    });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });

  it("should reject missing required fields", async () => {
    const response = await signUpUseCase.execute({
      email: "",
      password: "",
      name: "",
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("required");
  });

  it("should normalize email to lowercase", async () => {
    await signUpUseCase.execute({
      email: "DAVID@EXAMPLE.COM",
      password: "SecurePassword123",
      name: "David",
    });

    // Try to register with lowercase version
    const response = await signUpUseCase.execute({
      email: "david@example.com",
      password: "DifferentPassword123",
      name: "David Copy",
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("already registered");
  });
});

describe("Sign In Use Case", () => {
  let signInUseCase: SignInUseCase;
  let repository: InMemoryUserRepository;
  let passwordVerifier: MockPasswordVerifier;
  let sessionFactory: TestSessionFactory;

  beforeEach(async () => {
    repository = new InMemoryUserRepository();
    passwordVerifier = new MockPasswordVerifier();
    sessionFactory = new TestSessionFactory();
    signInUseCase = new SignInUseCase(
      repository,
      passwordVerifier,
      sessionFactory
    );

    // Pre-populate with a test user
    const mockHasher = new MockPasswordHasher();
    const hash = await mockHasher.hash("password123");
    const user = User.create(
      "test-user-id",
      "test@example.com",
      "Test User",
      hash
    );
    await repository.save(user);
  });

  it("should successfully authenticate valid credentials", async () => {
    const response = await signInUseCase.execute({
      email: "test@example.com",
      password: "password123",
    });

    expect(response.success).toBe(true);
    expect(response.userId).toBe("test-user-id");
    expect(response.sessionToken).toBe("session-test-user-id");
  });

  it("should reject invalid email", async () => {
    const response = await signInUseCase.execute({
      email: "nonexistent@example.com",
      password: "password123",
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("Invalid email or password");
  });

  it("should reject invalid password", async () => {
    const response = await signInUseCase.execute({
      email: "test@example.com",
      password: "wrongpassword",
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("Invalid email or password");
  });

  it("should reject missing fields", async () => {
    const response = await signInUseCase.execute({
      email: "",
      password: "",
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain("required");
  });
});

describe("Email Value Object", () => {
  it("should create valid email", () => {
    const email = new Email("user@example.com");
    expect(email.value).toBe("user@example.com");
  });

  it("should normalize to lowercase", () => {
    const email = new Email("USER@EXAMPLE.COM");
    expect(email.value).toBe("user@example.com");
  });

  it("should reject invalid email format", () => {
    expect(() => new Email("not-an-email")).toThrow();
    expect(() => new Email("@example.com")).toThrow();
    expect(() => new Email("user@")).toThrow();
  });

  it("should trim whitespace", () => {
    const email = new Email("  user@example.com  ");
    expect(email.value).toBe("user@example.com");
  });

  it("should compare emails", () => {
    const email1 = new Email("user@example.com");
    const email2 = new Email("user@example.com");
    const email3 = new Email("other@example.com");

    expect(email1.equals(email2)).toBe(true);
    expect(email1.equals(email3)).toBe(false);
  });
});

describe("User Entity", () => {
  it("should create user with factory method", () => {
    const user = User.create(
      "id123",
      "user@example.com",
      "John Doe",
      "$2b$10$mockHash"
    );

    expect(user.id).toBe("id123");
    expect(user.email.value).toBe("user@example.com");
    expect(user.name).toBe("John Doe");
    expect(user.isActive).toBe(true);
    expect(user.emailVerified).toBe(false);
  });

  it("should determine if user can authenticate", () => {
    const activeUser = User.create(
      "id1",
      "active@example.com",
      "Active User",
      "$2b$10$mockHash"
    );
    expect(activeUser.canAuthenticate()).toBe(true);
  });

  it("should check if user is fully verified", () => {
    const user = User.create(
      "id1",
      "user@example.com",
      "User",
      "$2b$10$mockHash"
    );
    expect(user.isFullyVerified()).toBe(false); // Not verified by default
  });

  it("should convert to plain object without password", () => {
    const user = User.create(
      "id1",
      "user@example.com",
      "John Doe",
      "$2b$10$mockHash"
    );
    const plain = user.toPlainObject();

    expect(plain.id).toBe("id1");
    expect(plain.email).toBe("user@example.com");
    expect(plain.name).toBe("John Doe");
    expect("passwordHash" in plain).toBe(false);
  });
});
