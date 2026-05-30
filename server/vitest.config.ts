import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },  
  test: {
    globals: true,
    alias: {
      "@": "./src",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/**/__tests__/**"],
    },
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    isolate: true,
    testTimeout: 5000,
    typecheck: {
      include: ["**/*.{spec|test}.{ts,tsx}"],
    },
    include: ["**/*.spec.ts"],
    exclude: ["node_modules", "dist", "build"],
  },
});
