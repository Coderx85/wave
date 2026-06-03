export type { ICacheStore } from "./icache-store";
export { RedisCacheStore } from "./redis-cache-store";
export type { RedisConfig } from "./redis-cache-store";
export { MemoryCacheStore } from "./memory-cache-store";
export { CacheFactory } from "./cache-factory";

import { CacheFactory } from "./cache-factory";
import type { ICacheStore } from "./icache-store";

export const cache: ICacheStore = CacheFactory.create();
