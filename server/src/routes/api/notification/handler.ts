import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess } from "@/lib/response";
import { NotificationRepository, NotificationPreferenceRepository } from "@/modules/notification/repository";
import type { INotificationRepository, INotificationPreferenceRepository } from "@/modules/notification/repository";
import { notificationStream } from "@/modules/notification/stream";
import type { INotificationStream } from "@/modules/notification/stream";
import type { INotificationController, INotificationParams, INotificationIdParams, INotificationQuery, INotificationDTO, INotificationPreferenceController, INotificationPreferenceBody } from "./definition";

export class NotificationController implements INotificationController, INotificationPreferenceController {
  constructor(
    private notificationRepository: INotificationRepository = new NotificationRepository(),
    private stream: INotificationStream = notificationStream,
    private preferenceRepository: INotificationPreferenceRepository = new NotificationPreferenceRepository()
  ) {}

  async listNotificationsHandler(
    request: FastifyRequest<{ Params: INotificationParams; Querystring: INotificationQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    const { userId } = request.params;
    const limit = request.query.limit ?? 50;
    try {
      const res = await this.notificationRepository.findByUserId(userId, limit);
      sendSuccess({
        reply,
        statusCode: 200,
        message: "SUCCESSFULLY FETCHED NOTIFICATIONS",
        data: res,
      });
    } catch (error) {
      sendError({
        reply,
        statusCode: 500,
        message: "FAILED TO FETCH NOTIFICATIONS",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  async markReadHandler(
    request: FastifyRequest<{ Params: INotificationIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { notificationId } = request.params;
    try {
      await this.notificationRepository.markAsRead(notificationId);
      sendSuccess({
        reply,
        statusCode: 200,
        message: "SUCCESSFULLY_MARKED_READ",
        data: { success: true },
      });
    } catch (error) {
      sendError({
        reply,
        statusCode: 500,
        message: "FAILED_TO_MARK_READ",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  async dismissHandler(
    request: FastifyRequest<{ Params: INotificationIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { notificationId } = request.params;
    try {
      await this.notificationRepository.delete(notificationId);
      sendSuccess({
        reply,
        statusCode: 200,
        message: "SUCCESSFULLY_DISMISSED",
        data: { deleted: true },
      });
    } catch (error) {
      sendError({
        reply,
        statusCode: 500,
        message: "FAILED_TO_DISMISS",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  async getPreferencesHandler(
    request: FastifyRequest<{ Params: INotificationParams }>,
    reply: FastifyReply
  ): Promise<void> {
    const { userId } = request.params;
    try {
      const res = await this.preferenceRepository.findByUserId(userId);
      sendSuccess({
        reply,
        statusCode: 200,
        message: "SUCCESSFULLY_FETCHED_PREFERENCES",
        data: res,
      });
    } catch (error) {
      sendError({
        reply,
        statusCode: 500,
        message: "FAILED_TO_FETCH_PREFERENCES",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  async updatePreferenceHandler(
    request: FastifyRequest<{ Params: INotificationParams; Body: INotificationPreferenceBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const { userId } = request.params;
    const { eventType, enabled } = request.body;
    try {
      const res = await this.preferenceRepository.upsert(userId, eventType, enabled);
      sendSuccess({
        reply,
        statusCode: 200,
        message: "SUCCESSFULLY_UPDATED_PREFERENCE",
        data: res,
      });
    } catch (error) {
      sendError({
        reply,
        statusCode: 500,
        message: "FAILED_TO_UPDATE_PREFERENCE",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  async streamNotificationsHandler(
    request: FastifyRequest<{ 
      Params: INotificationParams; 
      Querystring: INotificationQuery
    }>,

    reply: FastifyReply
  ): Promise<void> {
    const { userId } = request.params;
    const limit = request.query.limit ?? 50;
    let data = [] as INotificationDTO[];
    // Keep connection alive (prevents automatic close)
      reply.sse.keepAlive()
    
      try{
        // Send the unread notifications immediately upon connection
        data = await this.notificationRepository.findByUserId(userId, limit);
        
        // Send initial batch of notifications
        reply.sse.send({
          data: {
            result: data,
            message: "SUCCESSFULLY STREAMED NOTIFICATIONS"
          },
        })

        const interval = setInterval(async () => {
        if (reply.sse.isConnected) {
          await reply.sse.send({ data: 'ping' })
        } else {
          clearInterval(interval)
        }
      }, 1000)

      // Clean up when connection closes
      reply.sse.onClose(() => {
        clearInterval(interval)
        console.log('Connection closed')
      })
    } catch (error) {
      reply.sse.send({
        data: {
          result: [],
          message: "FAILED TO STREAM NOTIFICATIONS",
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }
}

export const notificationController = new NotificationController();
