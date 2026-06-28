import { config } from "./lib/config";
import { buildServer } from "./server";
import { type FastifyServerOptions } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth";
import { initializeKafkaRPC } from "./modules/kafka";
import { OutboxReplayService } from "./modules/wallet/service/outbox-replay.service";

const PORT = config.port;

const isProduction = process.env.NODE_ENV === "production";

const opt: FastifyServerOptions = {
  logger: {
    transport: isProduction
      ? undefined
      : {
          target: "pino-pretty",
        },
  },
  routerOptions: {
    ignoreTrailingSlash: true,
  },
};

// Initialize Kafka RPC before building the server
await initializeKafkaRPC();

// Start background outbox replay loop for unpublished transaction events
const outboxReplay = new OutboxReplayService();
outboxReplay.startReplayLoop();

const app = await buildServer(opt);

// 1. Authentication route - Proxy to authentication service
app.route({
  method: ["GET", "POST"],
  url: "/api/auth/*",
  async handler(request, reply) {
    try{
      const url = new URL(request.url, `http://${request.headers.host}`);

      const headers = fromNodeHeaders(request.headers);

      const req = new Request(url.toString(), {
        method: request.method,
        headers,
        ...(request.body ? { body: JSON.stringify(request.body) } : {}),
      });
      // Process authentication request
      const response = await auth.handler(req);
      // Forward response to client
      reply.status(response.status);
      response.headers.forEach((value, key) => reply.header(key, value));
      return reply.send(response.body ? await response.text() : null);
    } catch (error: unknown) {
      app.log.error("Authentication Error:");
      return reply.status(500).send({ 
        error: "Internal authentication error",
        code: "AUTH_FAILURE"
      });
    }
  }
})

const server = app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});

export { app, server };
