/**
 * Password Hasher & Verifier Adapters
 * 
 * These could use bcrypt, argon2, or other algorithms.
 * We provide mock implementations for testing.
 */

import type { IPasswordHasher } from "../use-cases/sign-up.use-case";
import type { IPasswordVerifier } from "../use-cases/sign-in.use-case";

/**
 * Mock Password Hasher for Testing
 * Returns a fake bcrypt-like hash for testing
 */
export class MockPasswordHasher implements IPasswordHasher {
  async hash(plaintext: string): Promise<string> {
    // In real implementation, use bcrypt:
    // const bcrypt = require('bcrypt');
    // return bcrypt.hash(plaintext, 10);

    // For testing, return a mock hash
    return `$2b$10$mock${plaintext.length}charactersofmockedhash00000000000000000`;
  }
}

/**
 * Mock Password Verifier for Testing
 */
export class MockPasswordVerifier implements IPasswordVerifier {
  async verify(plaintext: string, hash: string): Promise<boolean> {
    // In real implementation, use bcrypt:
    // const bcrypt = require('bcrypt');
    // return bcrypt.compare(plaintext, hash);

    // For testing, just check if plaintext length matches the mock hash
    return hash.includes(`mock${plaintext.length}characters`);
  }
}

/**
 * Null implementations for use in tests that don't need password hashing
 */
export class NullPasswordHasher implements IPasswordHasher {
  async hash(plaintext: string): Promise<string> {
    return plaintext; // Never do this in production!
  }
}

export class NullPasswordVerifier implements IPasswordVerifier {
  async verify(plaintext: string, hash: string): Promise<boolean> {
    return plaintext === hash; // Never do this in production!
  }
}
