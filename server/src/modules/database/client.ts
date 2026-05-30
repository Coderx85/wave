import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "@env";
import * as schema from "./schema";
import { relations } from "./relations";

// drizzle-orm/node-postgres expects a connection string for initialization
export const db = drizzle(config.databaseUrl, {
  schema,
  relations,
  casing: "snake_case",
});