// sample.schema.ts
import { z } from "zod";
import { successResponseSchema, errorResponseSchema } from "@/lib/response";

// Define properties of the sampleDTO here using zod
export const sampleDTO = z.object({
  // id: z.string(),
});

// Schema for GET Sample endpoint response
export const getSampleResponseSchema = {
  response: {
    200: successResponseSchema(sampleDTO),
    400: errorResponseSchema,
  },
};
