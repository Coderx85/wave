import type { FastifyRequest, FastifyReply } from "fastify";
import { sendSuccess, sendError } from "@/lib/response";
import * as definition from "./definition";

export class SampleController implements definition.ISampleController {
  async getSampleHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<definition.TGetSampleResponse | void> {
    return sendSuccess({
      reply,
      statusCode: 200,
      message: "Successfully fetched Sample",
      data: {} as any,
    });
  }
}

export const sampleController = new SampleController();
