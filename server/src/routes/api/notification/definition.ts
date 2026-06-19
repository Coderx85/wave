import type { FastifyReply, FastifyRequest } from "fastify";
import type { StandardResponse } from "@/lib/response";
import type { INotification } from "@/modules/notification/repository";

export interface INotificationDTO extends INotification {}

export interface INotificationParams {
  userId: string;
};

export interface INotificationIdParams {
  userId: string;
  notificationId: string;
};

export interface INotificationQuery {
  limit?: number;
};

export interface INotificationController {
  listNotificationsHandler(
    request: FastifyRequest<{ Params: INotificationParams; Querystring: INotificationQuery }>,
    reply: FastifyReply
  ): Promise<void>;

  streamNotificationsHandler(
    request: FastifyRequest<{ Params: INotificationParams; Querystring: INotificationQuery }>,
    reply: FastifyReply
  ): Promise<void>;

  markReadHandler(
    request: FastifyRequest<{ Params: INotificationIdParams }>,
    reply: FastifyReply
  ): Promise<void>;

  dismissHandler(
    request: FastifyRequest<{ Params: INotificationIdParams }>,
    reply: FastifyReply
  ): Promise<void>;
}

export interface INotificationPreferenceBody {
  eventType: "deposit" | "transfer_incoming" | "transfer_outgoing";
  enabled: boolean;
}

export interface INotificationPreferenceController {
  getPreferencesHandler(
    request: FastifyRequest<{ Params: INotificationParams }>,
    reply: FastifyReply
  ): Promise<void>;

  updatePreferenceHandler(
    request: FastifyRequest<{ Params: INotificationParams; Body: INotificationPreferenceBody }>,
    reply: FastifyReply
  ): Promise<void>;
}

export const notificationApiRoutes = {
  listNotifications: "/users/:userId/notifications",
  streamNotifications: "/users/:userId/notifications/stream",
  markRead: "/users/:userId/notifications/:notificationId/read",
  dismiss: "/users/:userId/notifications/:notificationId",
  getPreferences: "/users/:userId/notification-preferences",
  updatePreference: "/users/:userId/notification-preferences",
} as const;
