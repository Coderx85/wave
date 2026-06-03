import Redis from "ioredis";
import { Logger } from "@/lib/logger";
import type { ICacheStore } from "./icache-store";

const logger = Logger("RedisCacheStore");

export type RedisConfig = {
  host: string;
  port: number;
};

export class RedisCacheStore implements ICacheStore {
  private readonly redis: Redis;

  constructor(config: RedisConfig) {
    this.redis = new Redis({
      host: config.host,
      port: config.port,
      maxRetriesPerRequest: null,
      connectTimeout: 2000,
    });

    this.redis.on("error", (error: unknown) => {
      logger.warn("Redis connection error", error);
    });

    this.redis.on("connect", () => {
      logger.info("Connected to Redis (Dragonfly).");
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      if (value) {
        logger.info(`Cache HIT for key: ${key}`);
        return JSON.parse(value) as T;
      }
      logger.info(`Cache MISS for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache GET operation failed for key "${key}":`, error);
      throw error;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const payload = JSON.stringify(value);
      if (ttl) {
        await this.redis.set(key, payload, "EX", ttl);
      } else {
        await this.redis.set(key, payload);
      }
      logger.info(`Cache SET for key: ${key}`);
    } catch (error) {
      logger.error(`Cache SET operation failed for key "${key}":`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      logger.info(`Cache DEL for key: ${key}`);
    } catch (error) {
      logger.error(`Cache DEL operation failed for key "${key}":`, error);
      throw error;
    }
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
}
