/**
 * Currency Formatter Utility
 * Handles conversion between BigInt (database representation) and Number (API representation)
 * Ensures consistent handling of monetary amounts across the wallet module
 */

export interface CurrencyConversionOptions {
  precision?: number;
  roundingMode?: "floor" | "ceil" | "round";
}

export class CurrencyFormatter {
  private static readonly DEFAULT_PRECISION = 2;
  private static readonly DEFAULT_ROUNDING = "floor" as const;

  /**
   * Converts a number (in cents/smallest unit) to BigInt
   * @param amount Number amount (e.g., 1000 cents = $10.00)
   * @param options Conversion options
   * @returns BigInt representation
   */
  static toCents(amount: number, options?: CurrencyConversionOptions): bigint {
    if (!Number.isFinite(amount)) {
      throw new Error(`Invalid amount: ${amount}. Must be a finite number.`);
    }

    if (amount < 0) {
      throw new Error(`Invalid amount: ${amount}. Amount cannot be negative.`);
    }

    const precision = options?.precision ?? this.DEFAULT_PRECISION;
    const multiplier = Math.pow(10, precision);
    const rounded = Math.floor(amount * multiplier);

    return BigInt(rounded);
  }

  /**
   * Converts BigInt (cents/smallest unit) to number
   * @param cents BigInt amount in cents
   * @param options Conversion options
   * @returns Number representation (e.g., 1000 cents = 10.00)
   */
  static fromCents(cents: bigint, options?: CurrencyConversionOptions): number {
    if (typeof cents !== "bigint") {
      throw new Error(`Invalid cents: ${cents}. Must be a BigInt.`);
    }

    const precision = options?.precision ?? this.DEFAULT_PRECISION;
    const divisor = Math.pow(10, precision);
    const numericCents = Number(cents);

    if (!Number.isSafeInteger(numericCents)) {
      console.warn(
        `Loss of precision: ${cents} exceeds JavaScript's safe integer limit. Result may be inaccurate.`
      );
    }

    return numericCents / divisor;
  }

  /**
   * Batch converts multiple amounts to cents
   * @param amounts Array of amounts to convert
   * @param options Conversion options
   * @returns Array of BigInt values
   */
  static batchToCents(
    amounts: number[],
    options?: CurrencyConversionOptions
  ): bigint[] {
    return amounts.map(amount => this.toCents(amount, options));
  }

  /**
   * Batch converts multiple BigInt values to numbers
   * @param centsList Array of BigInt values
   * @param options Conversion options
   * @returns Array of number values
   */
  static batchFromCents(
    centsList: bigint[],
    options?: CurrencyConversionOptions
  ): number[] {
    return centsList.map(cents => this.fromCents(cents, options));
  }

  /**
   * Validates if an amount is a valid currency value
   * @param amount Amount to validate
   * @returns True if valid, false otherwise
   */
  static isValidAmount(amount: unknown): boolean {
    if (typeof amount !== "number") {
      return false;
    }

    return Number.isFinite(amount) && amount >= 0;
  }

  /**
   * Validates if a BigInt value is a valid currency representation
   * @param cents BigInt value to validate
   * @returns True if valid, false otherwise
   */
  static isValidCents(cents: unknown): boolean {
    if (typeof cents !== "bigint") {
      return false;
    }

    return cents >= 0n;
  }

  /**
   * Rounds a currency amount according to precision and rounding mode
   * @param amount Amount to round
   * @param precision Decimal precision
   * @param roundingMode Rounding strategy
   * @returns Rounded amount
   */
  static roundAmount(
    amount: number,
    precision: number = this.DEFAULT_PRECISION,
    roundingMode: "floor" | "ceil" | "round" = this.DEFAULT_ROUNDING
  ): number {
    if (!Number.isFinite(amount)) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    const multiplier = Math.pow(10, precision);

    switch (roundingMode) {
      case "floor":
        return Math.floor(amount * multiplier) / multiplier;
      case "ceil":
        return Math.ceil(amount * multiplier) / multiplier;
      case "round":
        return Math.round(amount * multiplier) / multiplier;
      default:
        return Math.floor(amount * multiplier) / multiplier;
    }
  }

  /**
   * Adds two BigInt amounts safely
   * @param amount1 First amount in cents
   * @param amount2 Second amount in cents
   * @returns Sum as BigInt
   */
  static addCents(amount1: bigint, amount2: bigint): bigint {
    if (typeof amount1 !== "bigint" || typeof amount2 !== "bigint") {
      throw new Error("Both amounts must be BigInt values");
    }

    return amount1 + amount2;
  }

  /**
   * Subtracts two BigInt amounts safely
   * @param amount1 First amount in cents
   * @param amount2 Amount to subtract in cents
   * @returns Difference as BigInt
   */
  static subtractCents(amount1: bigint, amount2: bigint): bigint {
    if (typeof amount1 !== "bigint" || typeof amount2 !== "bigint") {
      throw new Error("Both amounts must be BigInt values");
    }

    const result = amount1 - amount2;

    if (result < 0n) {
      throw new Error("Subtraction would result in negative value");
    }

    return result;
  }

  /**
   * Compares two BigInt amounts
   * @param amount1 First amount in cents
   * @param amount2 Second amount in cents
   * @returns -1 if amount1 < amount2, 0 if equal, 1 if amount1 > amount2
   */
  static compareCents(amount1: bigint, amount2: bigint): -1 | 0 | 1 {
    if (typeof amount1 !== "bigint" || typeof amount2 !== "bigint") {
      throw new Error("Both amounts must be BigInt values");
    }

    if (amount1 < amount2) return -1;
    if (amount1 > amount2) return 1;
    return 0;
  }

  /**
   * Calculates percentage of a BigInt amount
   * @param amount Amount in cents
   * @param percentage Percentage to calculate (0-100)
   * @returns Percentage as BigInt
   */
  static percentageOfCents(amount: bigint, percentage: number): bigint {
    if (typeof amount !== "bigint") {
      throw new Error("Amount must be a BigInt value");
    }

    if (percentage < 0 || percentage > 100) {
      throw new Error("Percentage must be between 0 and 100");
    }

    const percentageAmount = (amount * BigInt(Math.floor(percentage * 100))) / 10000n;
    return percentageAmount;
  }
}

export default CurrencyFormatter;
