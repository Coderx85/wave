import { tryCatch } from "@/lib/try-catch-wrapper";
import { db as defaultDb } from "@/modules/database/client";
import type { IPostgresStore, DrizzleDb, DrizzleTx } from "./pg-store.interface";

export class PostgresStore implements IPostgresStore {
  private _client: DrizzleDb;

  constructor(client?: DrizzleDb) {
    this._client = client ?? (defaultDb as DrizzleDb);
  }

  get client(): DrizzleDb {
    return this._client;
  }

  async run<T>(operation: () => Promise<T>, errorLabel?: string): Promise<T> {
    return tryCatch({
      ctx: operation,
      errorMessage: errorLabel ?? "DATABASE_OPERATION_FAILED",
    });
  }

  async transaction<T>(
    fn: (tx: DrizzleTx) => Promise<T>,
    errorLabel?: string,
  ): Promise<T> {
    return tryCatch({
      ctx: () => this._client.transaction(fn),
      errorMessage: errorLabel ?? "TRANSACTION_FAILED",
    });
  }
}
