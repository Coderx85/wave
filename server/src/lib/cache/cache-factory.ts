import { config } from "@/lib/config";
import { Logger } from "@/lib/logger";
import { RedisCacheStore, type RedisConfig } from "./redis-cache-store";
import { MemoryCacheStore } from "./memory-cache-store";
import type { ICacheStore } from "./icache-store";

const logger = Logger("CacheFactory");

function shouldUseMemoryStore(): boolean {
  if (config.env === "test") {
    return true;
  }
  if (config.env === "development" && !process.env.CACHE_HOST) {
    return true;
  }
  return false;
}

export class CacheFactory {
  static create(): ICacheStore {
    if (shouldUseMemoryStore()) {
      logger.info("Using MemoryCacheStore");
      return new MemoryCacheStore();
    }

    const redisConfig: RedisConfig = {
      host: config.cacheHost,
      port: config.cachePort,
    };

    logger.info(`Creating RedisCacheStore (${redisConfig.host}:${redisConfig.port})`);
    return new RedisCacheStore(redisConfig);
  }

  static createMemoryStore(): MemoryCacheStore {
    return new MemoryCacheStore();
  }
}
