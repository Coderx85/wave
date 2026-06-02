import { tryCatch } from "@/lib/try-catch-wrapper";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/modules/database/schema";
import type { relations } from "@/modules/database/relations";

export type DrizzleDb = NodePgDatabase<typeof schema, typeof relations>;

export abstract class BaseRepository {
  constructor(protected readonly db: DrizzleDb) {}

  protected async run<T>(
   operation: () => Promise<T>,
    errorCode?: string,
  ): Promise<T> {
    return tryCatch({
      ctx: operation,
      errorMessage: errorCode ?? "DATABASE_OPERATION_FAILED",
    });
  }

  protected numberFromDb(value: string | number | bigint | null | undefined): number {
    return Number(value ?? 0);
  }

  protected numberToDb(value: number): string {
    return value.toString();
  }

  protected numberFromBigInt(value: bigint | number | null | undefined): number {
    return Number(value ?? 0);
  }

  protected bigIntToDb(value: number): bigint {
    return BigInt(value);
  }
}
