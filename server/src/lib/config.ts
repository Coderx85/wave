export const config = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/wave_db",
  // Better Auth Configuration
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL,
  // Cache Configuration
  cacheHost: process.env.CACHE_HOST || "localhost",
  cachePort: Number(process.env.CACHE_PORT) || 6379,
} as const;
