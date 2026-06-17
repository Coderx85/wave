import { describe, it, expect } from "vitest";
import * as schema from "./sample.schema";

describe("sampleDTO", () => {
  it("accepts empty object", () => {
    const result = schema.sampleDTO.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("getSampleResponseSchema", () => {
  it("has response key", () => {
    expect(schema.getSampleResponseSchema).toHaveProperty("response");
  });
});