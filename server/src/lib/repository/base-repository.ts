import { tryCatch } from "@/lib/try-catch-wrapper";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/modules/database/schema";
import type { relations } from "@/modules/database/relations";
import { db } from "@/modules/database/client";
import { CacheFactory, type ICacheStore } from "@/lib/cache";

export type DrizzleDb = NodePgDatabase<typeof schema, typeof relations>;

abstract class BaseRepository {
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

export class DrizzleRepository extends BaseRepository {
  protected static dbInstance: DrizzleDb | null = null;
  protected db: DrizzleDb;

  constructor(dbInstance?: DrizzleDb) {
    super();
    if (dbInstance) {
      this.db = dbInstance;
    } else {
      if (!DrizzleRepository.dbInstance) {
        DrizzleRepository.dbInstance = db as DrizzleDb;
      }
      this.db = DrizzleRepository.dbInstance;
    }
  }
}

export class CachedRepository extends DrizzleRepository {
  protected cache: ICacheStore;

  constructor(dbInstance?: DrizzleDb, cacheStore?: ICacheStore) {
    super(dbInstance);
    this.cache = cacheStore ?? CacheFactory.create();
  }

  protected getCacheKey(...parts: string[]): string {
    return parts.join(":");
  }
}
