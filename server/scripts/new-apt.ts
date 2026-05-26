import { mkdirSync, existsSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { join, dirname } from "path";

function writeFile(file: string, content: string) {
  writeFileSync(file, content, { flag: "w" });
}

function appendLine(file: string, line: string) {
  appendFileSync(file, line + "\n");
}

const endpointName = process.argv[2];
if (!endpointName) {
  console.error(
    "Please provide an endpoint name as an argument (lowercase, alphanumeric).\nUsage: bun scripts/new-api-method.ts <endpoint-name>",
  );
  process.exit(1);
}

if (!/^[a-z][a-zA-Z0-9]+$/.test(endpointName)) {
  console.error(
    "Error: Endpoint name must start with a lowercase letter and contain only alphanumeric characters.",
  );
  process.exit(1);
}

const methodName = endpointName.toLowerCase(); // e.g. "sample"
const capitalizedName = methodName.charAt(0).toUpperCase() + methodName.slice(1); // e.g. "Sample"

const schemaDir = join("src", "schemas");
const apiDir = join("src", "routes", "api");
mkdirSync(apiDir, { recursive: true });
mkdirSync(schemaDir, { recursive: true });

const routeDir = join(apiDir, methodName);

mkdirSync(routeDir, { recursive: true });

const schemaFile = join(schemaDir, `${methodName}.schema.ts`); // Eg: src/schemas/sample.schema.ts
const indexFile = join(routeDir, "index.ts"); // Eg: src/routes/api/sample/index.ts
const definitionFile = join(routeDir, "definition.ts"); // Eg: src/routes/api/sample/definition.ts
const controllerFile = join(routeDir, "handler.ts"); // Eg: src/routes/api/sample/handler.ts
const testFile = join(routeDir, "index.spec.ts"); // Eg: src/routes/api/sample/index.spec.ts

// Only GET enpoint is implemented for now, but we can easily extend this in the future to support other methods (POST, PUT, DELETE) by following a similar pattern.

// Generate GET endpoint boilerplate

// defintion.ts
writeFile(
  definitionFile,
  `// ${methodName} definition.ts
import type { FastifyRequest, FastifyReply } from "fastify";
import type { StandardResponse } from "@/lib/response";

// DTOs
export interface T${capitalizedName}DTO {
  // Define properties of the ${capitalizedName}DTO here
}

export type TGet${capitalizedName}Response = StandardResponse<T${capitalizedName}DTO>;
  
// Controller Interface
export interface I${capitalizedName}Controller {
  get${capitalizedName}Handler(request: FastifyRequest, reply: FastifyReply): Promise<TGet${capitalizedName}Response | void>;
}`,
);

// scehma/[methodName].schema.ts
writeFile(
  schemaFile,
  `// ${methodName}.schema.ts
import { z } from "zod";
import { successResponseSchema, errorResponseSchema } from "@/lib/response";

// Define properties of the ${methodName}DTO here using zod
export const ${methodName}DTO = z.object({
  // id: z.string(),
});

// Schema for GET ${capitalizedName} endpoint response
export const get${capitalizedName}ResponseSchema = {
  response: {
    200: successResponseSchema(${methodName}DTO),
    400: errorResponseSchema,
  },
};
`,
);

// handler.ts
writeFile(
  controllerFile,
  `import type { FastifyRequest, FastifyReply } from "fastify";
import { sendSuccess, sendError } from "@/lib/response";
import * as definition from "./definition";

export class ${capitalizedName}Controller implements definition.I${capitalizedName}Controller {
  async get${capitalizedName}Handler(request: FastifyRequest, reply: FastifyReply): Promise<definition.TGet${capitalizedName}Response | void> {
    return sendSuccess({ reply, statusCode: 200, message: "Successfully fetched ${capitalizedName}", data: {} as any });
  }
}

export const ${methodName}Controller = new ${capitalizedName}Controller();
`,
);

// index.ts
writeFile(
  indexFile,
  `// ${methodName} index.ts
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

import * as schema from "@/schemas/${methodName}.schema";
import { ${methodName}Controller } from "./handler";

export default async function ${methodName}Route(fastify: FastifyInstance) {
  // Register GET ${capitalizedName} endpoint
  fastify.withTypeProvider<ZodTypeProvider>().get("/", {
    schema: schema.get${capitalizedName}ResponseSchema,
    handler: ${methodName}Controller.get${capitalizedName}Handler,
  });
}`,
);

// src/routes/api/[methodName]/index.spec.ts
writeFile(
  testFile,
  `import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import type { FastifyInstance } from "fastify";
import * as definition from "./definition";
import { ${methodName}Controller } from "./handler";
import ${methodName}Route from "./index";

describe("${capitalizedName} API", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = (await import("fastify")).default();
    await app.register(${methodName}Route);
  });

  afterEach(async () => {
    await app.close();
  });

  describe("GET /", () => {
    it("should return ${capitalizedName} data", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/",
      });

      expect(response.statusCode).toBe(200);
      const payload = response.json();
      expect(payload).toHaveProperty("ok");
      expect(payload).toHaveProperty("data");
    });
  });
});
`,
);
