import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/modules/database/schema";
import type { relations } from "@/modules/database/relations";

export type DrizzleDb = NodePgDatabase<typeof schema, typeof relations>;
export type DrizzleTx = Parameters<Parameters<DrizzleDb["transaction"]>[0]>[0];

export interface IPostgresStore {
  get client(): DrizzleDb;
  run<T>(operation: () => Promise<T>, errorLabel?: string): Promise<T>;
  transaction<T>(
    fn: (tx: DrizzleTx) => Promise<T>,
    errorLabel?: string,
  ): Promise<T>;
}
