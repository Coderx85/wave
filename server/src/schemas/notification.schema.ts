import { z } from "zod";
import { successResponseSchema, errorResponseSchema } from "@/lib/response";

export const notificationDTO = z.object({
  id: z.string(),
  transactionId: z.string(),
  userId: z.string(),
  email: z.string(),
  subject: z.string(),
  message: z.string(),
  status: z.enum(["pending", "sent", "failed"]),
  sentAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const userIdParamsSchema = z.object({
  userId: z.string(),
});

export const listNotificationsResponseSchema = {
  params: userIdParamsSchema,
  querystring: notificationListQuerySchema,
  response: {
    200: successResponseSchema(z.array(notificationDTO)),
    400: errorResponseSchema,
  },
};
