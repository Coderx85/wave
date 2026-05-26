import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { auth } from "@/lib/auth";

/**
 * Auth Route Handler
 * Handles all Better Auth endpoints under /api/auth/*
 */
export default async function authRoute(fastify: FastifyInstance) {
  /**
   * Catch-all handler for all auth routes
   * Routes all requests to the Better Auth handler
   */
  fastify.all("/:rest(.*)", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Create a new response to capture Better Auth's response
      const response = await auth.handler(request.raw as any);

      // Send the response from Better Auth directly
      reply.raw.statusCode = response.status;

      // Copy headers from Better Auth response
      for (const [key, value] of Object.entries(response.headers)) {
        reply.header(key, value as any);
      }

      // Send the body
      reply.send(response.body);
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        ok: false,
        status: 500,
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
