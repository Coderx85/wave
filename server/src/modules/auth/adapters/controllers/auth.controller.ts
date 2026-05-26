/**
 * Auth Controller
 * 
 * Fastify HTTP handler for auth endpoints.
 * Handles HTTP concerns only - parsing requests, formatting responses.
 * Delegates all business logic to use cases.
 * 
 * This layer is thin and has no business logic.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { SignUpUseCase } from "../../use-cases/sign-up.use-case";
import { SignInUseCase } from "../../use-cases/sign-in.use-case";
import { z } from "zod";

// Request validation schemas
const SignUpRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
});

const SignInRequestSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

type SignUpRequest = z.infer<typeof SignUpRequestSchema>;
type SignInRequest = z.infer<typeof SignInRequestSchema>;

export class AuthController {
  constructor(
    private signUpUseCase: SignUpUseCase,
    private signInUseCase: SignInUseCase
  ) {}

  async signUp(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Parse and validate request
      const body = SignUpRequestSchema.parse(request.body);

      // Execute use case
      const result = await this.signUpUseCase.execute(body);

      // Format response
      if (!result.success) {
        return reply.status(400).send({
          ok: false,
          status: 400,
          message: "Sign up failed",
          error: result.error,
        });
      }

      return reply.status(201).send({
        ok: true,
        status: 201,
        message: "User registered successfully",
        data: {
          userId: result.userId,
          email: result.email,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          ok: false,
          status: 400,
          message: "Validation failed",
          error: error.issues[0]?.message || "Validation error",
        });
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(500).send({
        ok: false,
        status: 500,
        message: "Sign up failed",
        error: message,
      });
    }
  }

  async signIn(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Parse and validate request
      const body = SignInRequestSchema.parse(request.body);

      // Execute use case
      const result = await this.signInUseCase.execute(body);

      // Format response
      if (!result.success) {
        return reply.status(401).send({
          ok: false,
          status: 401,
          message: "Authentication failed",
          error: result.error,
        });
      }

      return reply.status(200).send({
        ok: true,
        status: 200,
        message: "Signed in successfully",
        data: {
          userId: result.userId,
          email: result.email,
          sessionToken: result.sessionToken,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          ok: false,
          status: 400,
          message: "Validation failed",
          error: error.issues[0]?.message || "Validation error",
        });
      }

      const message = error instanceof Error ? error.message : "Unknown error";
      return reply.status(500).send({
        ok: false,
        status: 500,
        message: "Sign in failed",
        error: message,
      });
    }
  }
}

/**
 * Route registration function
 * Call this in your main route file
 */
export async function registerAuthRoutes(
  fastify: FastifyInstance,
  controller: AuthController
) {
  fastify.post("/sign-up", (request, reply) =>
    controller.signUp(request, reply)
  );
  fastify.post("/sign-in", (request, reply) =>
    controller.signIn(request, reply)
  );
}
