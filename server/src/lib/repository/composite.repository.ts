import type { IPostgresStore } from "./stores/pg-store.interface";
import type { ICacheStore } from "./stores/cache-store.interface";
import { PostgresStore } from "./stores/pg-store";
import { CacheFactory } from "@/lib/cache";

export abstract class CompositeRepository {
  protected readonly pg: IPostgresStore;
  protected readonly cache: ICacheStore;

  constructor(opts?: {
    pg?: IPostgresStore;
    cache?: ICacheStore;
  }) {
    this.pg = opts?.pg ?? new PostgresStore();
    this.cache = opts?.cache ?? CacheFactory.create();
  }

  /** Build consistent cache key from segments */
  protected cacheKey(...parts: string[]): string {
    return parts.join(":");
  }
}
