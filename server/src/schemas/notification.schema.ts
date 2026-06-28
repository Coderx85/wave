import { z } from "zod";
import { successResponseSchema, errorResponseSchema } from "@/lib/response";

export const notificationDTO = z.object({
  id: z.string(),
  transactionId: z.string(),
  userId: z.string(),
  email: z.string(),
  subject: z.string(),
  message: z.string(),
  status: z.enum(["pending", "sent", "failed", "dead_letter"]),
  read: z.boolean(),
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

export const notificationIdParamsSchema = z.object({
  userId: z.string(),
  notificationId: z.string(),
});

export const listNotificationsResponseSchema = {
  params: userIdParamsSchema,
  querystring: notificationListQuerySchema,
  response: {
    200: successResponseSchema(z.array(notificationDTO)),
    400: errorResponseSchema,
  },
};

export const markReadResponseSchema = {
  params: notificationIdParamsSchema,
  response: {
    200: successResponseSchema(notificationDTO),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const dismissResponseSchema = {
  params: notificationIdParamsSchema,
  response: {
    200: successResponseSchema(z.object({ deleted: z.boolean() })),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};

export const notificationPreferenceDTO = z.object({
  userId: z.string(),
  eventType: z.enum(["deposit", "transfer_incoming", "transfer_outgoing"]),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const notificationPreferenceBodySchema = z.object({
  eventType: z.enum(["deposit", "transfer_incoming", "transfer_outgoing"]),
  enabled: z.boolean(),
});

export const getPreferencesResponseSchema = {
  params: userIdParamsSchema,
  response: {
    200: successResponseSchema(z.array(notificationPreferenceDTO)),
    400: errorResponseSchema,
  },
};

export const updatePreferenceResponseSchema = {
  params: userIdParamsSchema,
  body: notificationPreferenceBodySchema,
  response: {
    200: successResponseSchema(notificationPreferenceDTO),
    400: errorResponseSchema,
    404: errorResponseSchema,
  },
};
