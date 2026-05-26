import { afterEach, vi } from "vitest";

// Wrap fastify to include pass-through compilers so route tests work with Zod schemas
vi.mock("fastify", async (importOriginal) => {
  const mod = (await importOriginal()) as any;
  return {
    ...mod,
    default: (...args: any[]) => {
      const app = mod.default(...args);
      app.setValidatorCompiler(() => (data: unknown) => ({ value: data }));
      app.setSerializerCompiler(() => (data: unknown) => JSON.stringify(data));
      return app;
    },
  };
});

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});
