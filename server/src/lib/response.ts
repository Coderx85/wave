import { type FastifyReply } from "fastify";
import { z } from "zod";

export interface StandardResponse<T = any> {
  ok: boolean;
  status: number;
  message: string;
  data?: T;
  error?: string;
}

interface SendSuccessOptions<T = any> {
  reply: FastifyReply;
  statusCode: number;
  message: string;
  data?: T;
}

interface SendErrorOptions {
  reply: FastifyReply;
  statusCode: number;
  message: string;
  error: string;
}

export function sendSuccess<T = any>(options: SendSuccessOptions<T>): StandardResponse<T> {
  const response: StandardResponse<T> = {
    ok: true,
    status: options.statusCode,
    message: options.message,
    data: options.data,
  };
  options.reply.code(options.statusCode).send(response);
  return response;
}

export function sendError(options: SendErrorOptions): StandardResponse {
  const response: StandardResponse = {
    ok: false,
    status: options.statusCode,
    message: options.message,
    error: options.error,
  };
  options.reply.code(options.statusCode).send(response);
  return response;
}

export function successResponseSchema<T extends z.ZodTypeAny>(schema: T) {
  return z.object({
    ok: z.literal(true),
    status: z.number(),
    message: z.string(),
    data: schema,
  });
}

export function errorResponseSchema() {
  return {
    ok: { type: "boolean" },
    status: { type: "number" },
    message: { type: "string" },
    error: { type: "string" },
  };
}
