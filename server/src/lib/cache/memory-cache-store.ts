import { Logger } from "@/lib/logger";
import type { ICacheStore } from "./icache-store";

const logger = Logger("MemoryCacheStore");

type CacheEntry<T> = {
  value: T;
  expiry: number | null;
};

export class MemoryCacheStore implements ICacheStore {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) {
      logger.info(`MemoryCache MISS for key: ${key}`);
      return null;
    }

    if (entry.expiry !== null && Date.now() > entry.expiry) {
      this.store.delete(key);
      logger.info(`MemoryCache EXPIRED for key: ${key}`);
      return null;
    }

    logger.info(`MemoryCache HIT for key: ${key}`);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiry = ttl ? Date.now() + ttl * 1000 : null;
    this.store.set(key, { value, expiry });
    logger.info(`MemoryCache SET for key: ${key}`);
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
    logger.info(`MemoryCache DEL for key: ${key}`);
  }

  async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }

  clear(): void {
    this.store.clear();
  }
}
