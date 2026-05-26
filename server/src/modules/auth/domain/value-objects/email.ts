/**
 * Email Value Object
 * 
 * Immutable, validated value object representing an email address.
 * Ensures only valid emails can be created - invalid emails throw at construction.
 */

export class Email {
  readonly value: string;

  constructor(email: string) {
    this.validate(email);
    this.value = email.toLowerCase().trim();
  }

  private validate(email: string): void {
    if (!email || email.trim().length === 0) {
      throw new Error("Email cannot be empty");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    if (email.length > 254) {
      throw new Error("Email is too long (max 254 characters)");
    }
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
