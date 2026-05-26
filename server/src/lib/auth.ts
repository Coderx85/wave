import { betterAuth } from "better-auth";
import { Pool } from "pg";

/**
 * Initialize PostgreSQL connection pool
 * Connection string comes from DATABASE_URL env variable
 */
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
    "Please set it in your .env file before starting the server."
  );
}

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error(
    "BETTER_AUTH_SECRET environment variable is not set. " +
    "Generate one with: openssl rand -base64 32"
  );
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Better Auth server instance with:
 * - PostgreSQL database adapter
 * - Email & password authentication
 * - Email verification
 * - Password reset
 */
export const auth = betterAuth({
  database: pool,
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  appName: "Wave",

  /**
   * Email & Password Configuration
   * Users can sign up and sign in with email/password
   */
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
    minPasswordLength: 8,
  },

  /**
   * User configuration
   */
  user: {
    additionalFields: {
      // Add any additional user fields here if needed
    },
  },

  /**
   * Session configuration
   * Sessions expire after 7 days by default
   */
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60, // Update age every hour
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  /**
   * Advanced security settings
   */
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    disableCSRFCheck: false,
  },

  /**
   * Trusted origins for CORS
   * Add your frontend URLs here
   */
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    // Add production URLs when deploying
    // "https://yourdomain.com",
  ],

  /**
   * Hooks for custom logic
   * Execute code before/after certain endpoints
   */
  // hooks configuration removed - add hooks when needed
});

/**
 * Export session and user types for client-side type safety
 */
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
