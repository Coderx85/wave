import { config } from "./lib/config";
import { buildServer } from "./server";
import { type FastifyServerOptions } from "fastify";

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

const app = await buildServer(opt);

const server = app.listen({ port: PORT, host: "0.0.0.0" }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
  app.log.info(`Server listening at ${address}`);
});

export { app, server };
