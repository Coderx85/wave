import { timestamp } from "drizzle-orm/pg-core";

export const timeStamps = {
  updatedAt: timestamp(),
  createdAt: timestamp().defaultNow().notNull(),
};