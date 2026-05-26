// sample.spec.ts
import { type ISampleService } from "./sample.definition";
import { SampleService } from "./sample.service";
import { describe, it, expect, beforeEach } from "vitest";

describe("SampleService", () => {
  let service: ISampleService;
  beforeEach(() => {
    service = new SampleService();
  });
  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
