// sample definition.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import type { StandardResponse } from "@/lib/response";

// DTOs
export interface TSampleDTO {
  // Define properties of the SampleDTO here
}

export type TGetSampleResponse = StandardResponse<TSampleDTO>;

// Controller Interface
export interface ISampleController {
  getSampleHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<TGetSampleResponse | void>;
}
