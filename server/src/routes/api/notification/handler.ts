import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess, type StandardResponse } from "@/lib/response";
import { NotificationRepository } from "@/modules/notification/repository";
import type { INotificationRepository } from "@/modules/notification/repository";
import { notificationStream } from "@/modules/notification/stream";
import type { INotificationStream, INotificationStreamEvent } from "@/modules/notification/stream";
import type { INotificationController, INotificationParams, INotificationQuery, INotificationDTO } from "./definition";
import { tryCatch } from "@/lib/try-catch-wrapper";

export class NotificationController implements INotificationController {
  constructor(
    private notificationRepository: INotificationRepository = new NotificationRepository(),
    private stream: INotificationStream = notificationStream
  ) {}

  async listNotificationsHandler(
    request: FastifyRequest<{ Params: INotificationParams; Querystring: INotificationQuery }>,
    reply: FastifyReply
  ): Promise<StandardResponse<INotificationDTO[]>> {
    const { userId } = request.params;
    const limit = request.query.limit ?? 50;
    let res: INotificationDTO[] = [];
    try {

      res = await this.notificationRepository.findByUserId(userId, limit);
        
      return sendSuccess({
        reply,
        statusCode: 200,
        message: "SUCCESSFULLY FETCHED NOTIFICATIONS",
        data: res,
      });
    }catch (error) {
      return sendError({
        reply,
        statusCode: 500,
        message: "FAILED TO FETCH NOTIFICATIONS",
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
