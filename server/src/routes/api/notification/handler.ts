import type { FastifyReply, FastifyRequest } from "fastify";
import { sendError, sendSuccess } from "@/lib/response";
import { NotificationService } from "@/modules/notification";
import type { INotificationController, INotificationParams, INotificationQuery, INotificationDTO } from "./definition";

export class NotificationController implements INotificationController {
  constructor(
    private notificationService: NotificationService = new NotificationService(),
  ) {}

  async listNotificationsHandler(
    request: FastifyRequest<{ Params: INotificationParams; Querystring: INotificationQuery }>,
    reply: FastifyReply
  ): Promise<void> {
    const { userId } = request.params;
    const limit = request.query.limit ?? 50;
    try {
      const res = await this.notificationService.findByUserId(userId, limit);
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
        data = await this.notificationService.findByUserId(userId, limit);
        
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