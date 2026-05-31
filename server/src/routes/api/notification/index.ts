import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import * as schema from "@/schemas/notification.schema";
import { notificationController } from "./handler";
import { notificationApiRoutes } from "./definition";

export default async function notificationRoute(fastify: FastifyInstance) {
  // Register GET Notifications endpoint
  fastify.withTypeProvider<ZodTypeProvider>().get(notificationApiRoutes.listNotifications, {
    schema: schema.listNotificationsResponseSchema,
    handler: notificationController.listNotificationsHandler,
  });

  // Register SSE Notifications endpoint
  fastify.withTypeProvider<ZodTypeProvider>().get(notificationApiRoutes.streamNotifications, {
    sse: true,
    schema: {
      params: schema.userIdParamsSchema,
      querystring: schema.notificationListQuerySchema,
    },
    handler: notificationController.streamNotificationsHandler,
  });
}
