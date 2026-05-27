import type { Config } from 'drizzle-kit';
import { config } from "@env";

const basePath = "./src/modules/database";

function setMigrationPath(env: string) {
  switch (env) {
    case "production":
      return `${basePath}/migrations`;
    case "development":
      return `${basePath}/supabase/migrations`;
    default:
      throw new Error(`Unknown environment: ${env}`);
  }
}

export default {
  schema: './src/modules/database/schema',
  out: setMigrationPath(config.env),
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: config.databaseUrl,
  },
  verbose: true,
  breakpoints: true,
  strict: true,
} satisfies Config;