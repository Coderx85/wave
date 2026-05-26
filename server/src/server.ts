import Fastify, { type FastifyServerOptions, type FastifyInstance } from "fastify";
import autoLoad from "@fastify/autoload";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import fp from "fastify-plugin";
import fastifyCors from "@fastify/cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// CORS configuration for frontend integration, allowing credentials and specific headers
// Adjust the origin as needed for production
const corsOptions = {
  origin: ["http://localhost:3000"], // Replace with your frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true,
  maxAge: 86400, // Cache preflight response for 24 hours
};

// Plugin version for serverless deployment
async function fastifyServerPlugin(fastify: FastifyInstance) {
  // Set the validator and serializer compilers
  fastify.setValidatorCompiler(validatorCompiler);
  fastify.setSerializerCompiler(serializerCompiler);

  await fastify.register(fastifyCors, {
    origin: corsOptions.origin,
    methods: corsOptions.methods,
    allowedHeaders: corsOptions.allowedHeaders,
    credentials: corsOptions.credentials,
    maxAge: corsOptions.maxAge,
  });

  // Auto-register API routes
  await fastify.register(autoLoad, {
    dir: join(__dirname, "routes"),
    routeParams: true,
  });
}

// Export as a Fastify plugin for serverless
export default fp(fastifyServerPlugin, {
  name: "fastify-server",
});

// Build function for standalone server
export async function buildServer(opt: FastifyServerOptions) {
  const fastify = Fastify(opt).withTypeProvider<ZodTypeProvider>();
  await fastify.register(fastifyServerPlugin);
  return fastify;
}
