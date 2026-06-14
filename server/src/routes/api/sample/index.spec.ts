import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { FastifyInstance } from "fastify";
import sampleRoute from "./index";

describe("Sample API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = (await import("fastify")).default();
    await app.register(sampleRoute);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /", () => {
    it("should return Sample data", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty("ok");
      expect(payload).toHaveProperty("data");
    });
  });
});