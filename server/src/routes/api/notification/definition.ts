import type { FastifyReply, FastifyRequest } from "fastify";
import type { StandardResponse } from "@/lib/response";
import type { INotification } from "@/modules/notification/repository";

export interface INotificationDTO extends INotification {}

export interface INotificationParams {
  userId: string;
};

export interface INotificationQuery {
  limit?: number;
};

export interface INotificationController {
  listNotificationsHandler(
    request: FastifyRequest<{ Params: INotificationParams; Querystring: INotificationQuery }>,
    reply: FastifyReply
  ): Promise<StandardResponse<INotificationDTO[]>>;

  streamNotificationsHandler(
    request: FastifyRequest<{ Params: INotificationParams; Querystring: INotificationQuery }>,
    reply: FastifyReply
  ): Promise<void>;
}

export const notificationApiRoutes = {
  listNotifications: "/users/:userId/notifications",
  streamNotifications: "/users/:userId/notifications/stream",
} as const;
