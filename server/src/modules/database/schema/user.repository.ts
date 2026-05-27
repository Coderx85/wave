import type { TUserId } from "@/types/id.types";
import { pgTable, text, boolean, index } from "drizzle-orm/pg-core";
import { timeStamps } from "./_column.helper";

export const users = pgTable("users", {
  id: text("id").primaryKey().$type<TUserId>(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  image: text("image"),
  ...timeStamps,
}, (table) => [
  index("users_email_idx").on(table.email),
]);
