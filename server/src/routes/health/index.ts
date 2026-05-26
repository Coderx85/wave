import { config } from "@/lib/config";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import z from "zod";

export const BodySchema = z.object({
  ping: z.string().optional(),
});

const handler = async (request: FastifyRequest, reply: FastifyReply) => {
  // const log = request.log;
  // const originalUrl = request.originalUrl;
  const statusCode = reply.statusCode;
  return {
    status: "ok",
    statusCode,
    environment: config.env,
  };
};

export default async function (fastify: FastifyInstance) {
  fastify.get("/", handler);
}
