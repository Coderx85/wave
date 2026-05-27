import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { config } from "@env";

const pool = new Pool({
  connectionString: config.databaseUrl,
});

export const client = drizzle(pool);