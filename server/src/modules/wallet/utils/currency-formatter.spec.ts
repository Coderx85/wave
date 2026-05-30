import { describe, it, expect } from "vitest";
import { CurrencyFormatter } from "../index";

describe("CurrencyFormatter", () => {
  describe("toCents", () => {
    it("should convert number to BigInt correctly", () => {
      const result = CurrencyFormatter.toCents(10.5);
      expect(result).toBe(1050n);
    });

    it("should handle whole numbers", () => {
      const result = CurrencyFormatter.toCents(100);
      expect(result).toBe(10000n);
    });

    it("should handle zero", () => {
      const result = CurrencyFormatter.toCents(0);
      expect(result).toBe(0n);
    });

    it("should handle small decimals", () => {
      const result = CurrencyFormatter.toCents(0.99);
      expect(result).toBe(99n);
    });

    it("should throw error for negative amounts", () => {
      expect(() => CurrencyFormatter.toCents(-10)).toThrow();
    });

    it("should throw error for non-finite numbers", () => {
      expect(() => CurrencyFormatter.toCents(Infinity)).toThrow();
      expect(() => CurrencyFormatter.toCents(NaN)).toThrow();
    });

    it("should handle custom precision", () => {
      const result = CurrencyFormatter.toCents(10.5, { precision: 4 });
      expect(result).toBe(105000n);
    });
  });

  describe("fromCents", () => {
    it("should convert BigInt to number correctly", () => {
      const result = CurrencyFormatter.fromCents(1050n);
      expect(result).toBe(10.5);
    });

    it("should handle zero", () => {
      const result = CurrencyFormatter.fromCents(0n);
      expect(result).toBe(0);
    });

    it("should handle large BigInt values", () => {
      const result = CurrencyFormatter.fromCents(999999999n);
      expect(result).toBe(9999999.99);
    });

    it("should throw error for non-BigInt inputs", () => {
      expect(() => CurrencyFormatter.fromCents(1050 as any)).toThrow();
    });

    it("should handle custom precision", () => {
      const result = CurrencyFormatter.fromCents(105000n, { precision: 4 });
      expect(result).toBe(10.5);
    });
  });

  describe("batchToCents", () => {
    it("should convert multiple amounts", () => {
      const amounts = [10, 20.5, 30];
      const result = CurrencyFormatter.batchToCents(amounts);
      expect(result).toEqual([1000n, 2050n, 3000n]);
    });

    it("should handle empty array", () => {
      const result = CurrencyFormatter.batchToCents([]);
      expect(result).toEqual([]);
    });
  });

  describe("batchFromCents", () => {
    it("should convert multiple BigInt values", () => {
      const centsList = [1000n, 2050n, 3000n];
      const result = CurrencyFormatter.batchFromCents(centsList);
      expect(result).toEqual([10, 20.5, 30]);
    });

    it("should handle empty array", () => {
      const result = CurrencyFormatter.batchFromCents([]);
      expect(result).toEqual([]);
    });
  });

  describe("isValidAmount", () => {
    it("should validate correct amounts", () => {
      expect(CurrencyFormatter.isValidAmount(10)).toBe(true);
      expect(CurrencyFormatter.isValidAmount(0)).toBe(true);
      expect(CurrencyFormatter.isValidAmount(10.5)).toBe(true);
    });

    it("should reject negative amounts", () => {
      expect(CurrencyFormatter.isValidAmount(-10)).toBe(false);
    });

    it("should reject non-numeric values", () => {
      expect(CurrencyFormatter.isValidAmount("10")).toBe(false);
      expect(CurrencyFormatter.isValidAmount(null)).toBe(false);
      expect(CurrencyFormatter.isValidAmount(undefined)).toBe(false);
    });

    it("should reject non-finite numbers", () => {
      expect(CurrencyFormatter.isValidAmount(Infinity)).toBe(false);
      expect(CurrencyFormatter.isValidAmount(NaN)).toBe(false);
    });
  });

  describe("isValidCents", () => {
    it("should validate correct BigInt values", () => {
      expect(CurrencyFormatter.isValidCents(1000n)).toBe(true);
      expect(CurrencyFormatter.isValidCents(0n)).toBe(true);
    });

    it("should reject negative BigInt values", () => {
      expect(CurrencyFormatter.isValidCents(-1000n)).toBe(false);
    });

    it("should reject non-BigInt values", () => {
      expect(CurrencyFormatter.isValidCents(1000)).toBe(false);
      expect(CurrencyFormatter.isValidCents("1000")).toBe(false);
      expect(CurrencyFormatter.isValidCents(null)).toBe(false);
    });
  });

  describe("roundAmount", () => {
    it("should floor by default", () => {
      const result = CurrencyFormatter.roundAmount(10.567);
      expect(result).toBe(10.56);
    });

    it("should ceil when specified", () => {
      const result = CurrencyFormatter.roundAmount(10.561, 2, "ceil");
      expect(result).toBe(10.57);
    });

    it("should round when specified", () => {
      const result = CurrencyFormatter.roundAmount(10.567, 2, "round");
      expect(result).toBe(10.57);
    });

    it("should handle different precision", () => {
      const result = CurrencyFormatter.roundAmount(10.5678, 3, "floor");
      expect(result).toBe(10.567);
    });

    it("should throw error for non-finite numbers", () => {
      expect(() => CurrencyFormatter.roundAmount(Infinity)).toThrow();
    });
  });

  describe("addCents", () => {
    it("should add two BigInt amounts", () => {
      const result = CurrencyFormatter.addCents(1000n, 2000n);
      expect(result).toBe(3000n);
    });

    it("should handle zero", () => {
      const result = CurrencyFormatter.addCents(1000n, 0n);
      expect(result).toBe(1000n);
    });

    it("should throw error for non-BigInt inputs", () => {
      expect(() => CurrencyFormatter.addCents(1000 as any, 2000n)).toThrow();
      expect(() => CurrencyFormatter.addCents(1000n, 2000 as any)).toThrow();
    });
  });

  describe("subtractCents", () => {
    it("should subtract two BigInt amounts", () => {
      const result = CurrencyFormatter.subtractCents(3000n, 1000n);
      expect(result).toBe(2000n);
    });

    it("should throw error for negative result", () => {
      expect(() => CurrencyFormatter.subtractCents(1000n, 2000n)).toThrow();
    });

    it("should handle zero result", () => {
      const result = CurrencyFormatter.subtractCents(1000n, 1000n);
      expect(result).toBe(0n);
    });

    it("should throw error for non-BigInt inputs", () => {
      expect(() => CurrencyFormatter.subtractCents(3000 as any, 1000n)).toThrow();
      expect(() => CurrencyFormatter.subtractCents(3000n, 1000 as any)).toThrow();
    });
  });

  describe("compareCents", () => {
    it("should return -1 when first < second", () => {
      const result = CurrencyFormatter.compareCents(1000n, 2000n);
      expect(result).toBe(-1);
    });

    it("should return 0 when amounts are equal", () => {
      const result = CurrencyFormatter.compareCents(1000n, 1000n);
      expect(result).toBe(0);
    });

    it("should return 1 when first > second", () => {
      const result = CurrencyFormatter.compareCents(2000n, 1000n);
      expect(result).toBe(1);
    });

    it("should throw error for non-BigInt inputs", () => {
      expect(() => CurrencyFormatter.compareCents(1000 as any, 2000n)).toThrow();
    });
  });

  describe("percentageOfCents", () => {
    it("should calculate percentage correctly", () => {
      const result = CurrencyFormatter.percentageOfCents(1000n, 10);
      expect(result).toBe(100n);
    });

    it("should handle 0 percentage", () => {
      const result = CurrencyFormatter.percentageOfCents(1000n, 0);
      expect(result).toBe(0n);
    });

    it("should handle 100 percentage", () => {
      const result = CurrencyFormatter.percentageOfCents(1000n, 100);
      expect(result).toBe(1000n);
    });

    it("should handle fractional percentage", () => {
      const result = CurrencyFormatter.percentageOfCents(1000n, 5.5);
      expect(result).toBe(55n);
    });

    it("should throw error for percentage > 100", () => {
      expect(() => CurrencyFormatter.percentageOfCents(1000n, 101)).toThrow();
    });

    it("should throw error for negative percentage", () => {
      expect(() => CurrencyFormatter.percentageOfCents(1000n, -10)).toThrow();
    });

    it("should throw error for non-BigInt input", () => {
      expect(() => CurrencyFormatter.percentageOfCents(1000 as any, 10)).toThrow();
    });
  });
});
