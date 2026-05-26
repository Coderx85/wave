// sample index.ts
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import * as schema from "@/schemas/sample.schema";
import { sampleController } from "./handler";

export default async function sampleRoute(fastify: FastifyInstance) {
  // Register GET Sample endpoint
  fastify.withTypeProvider<ZodTypeProvider>().get("/", {
    schema: schema.getSampleResponseSchema,
    handler: sampleController.getSampleHandler,
  });
}
