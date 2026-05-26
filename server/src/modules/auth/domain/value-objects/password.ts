/**
 * Password Value Object
 * 
 * Immutable, validated value object representing a hashed password.
 * Never stores plain text, only accepts pre-hashed passwords.
 */

export class Password {
  readonly hash: string;

  constructor(hash: string) {
    this.validate(hash);
    this.hash = hash;
  }

  private validate(hash: string): void {
    if (!hash || hash.trim().length === 0) {
      throw new Error("Password hash cannot be empty");
    }

    // Ensure it looks like a bcrypt hash (starts with $2a$, $2b$, $2x$, or $2y$)
    const bcryptRegex = /^\$2[aby]\$\d{2}\$.{53}$/;
    if (!bcryptRegex.test(hash)) {
      throw new Error("Password must be a valid bcrypt hash");
    }
  }

  static isPlaintext(value: string): boolean {
    // Simple check: if it doesn't start with bcrypt marker, it's plaintext
    return !value.startsWith("$2");
  }

  toString(): string {
    return "[REDACTED]";
  }
}
