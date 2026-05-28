import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { config } from "@env";
import { db } from "@/modules/database/client";
import { openAPI } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    camelCase: true,
    transaction: true,
    debugLogs: config.env === "development",
    usePlural: true,
  }),
  plugins: [openAPI()],
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  appName: "Wave",

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60, // Update age every hour
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },

  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    disableCSRFCheck: false,
  },

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
  ],

});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
