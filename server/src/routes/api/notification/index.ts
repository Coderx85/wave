import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as schema from "@/schemas/notification.schema";
import { notificationController } from "./handler";
import { notificationApiRoutes } from "./definition";

export default async function notificationRoute(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().get(notificationApiRoutes.listNotifications, {
    schema: schema.listNotificationsResponseSchema,
    handler: notificationController.listNotificationsHandler.bind(notificationController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().get(notificationApiRoutes.streamNotifications, {
    sse: true,
    schema: {
      params: schema.userIdParamsSchema,
      querystring: schema.notificationListQuerySchema,
    },
    handler: notificationController.streamNotificationsHandler.bind(notificationController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().patch(notificationApiRoutes.markRead, {
    schema: schema.markReadResponseSchema,
    handler: notificationController.markReadHandler.bind(notificationController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().delete(notificationApiRoutes.dismiss, {
    schema: schema.dismissResponseSchema,
    handler: notificationController.dismissHandler.bind(notificationController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().get(notificationApiRoutes.getPreferences, {
    schema: schema.getPreferencesResponseSchema,
    handler: notificationController.getPreferencesHandler.bind(notificationController),
  });

  fastify.withTypeProvider<ZodTypeProvider>().put(notificationApiRoutes.updatePreference, {
    schema: schema.updatePreferenceResponseSchema,
    handler: notificationController.updatePreferenceHandler.bind(notificationController),
  });
}
