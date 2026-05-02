import { pgTable, serial, text, boolean, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { membersTable } from "./members";

export const memberNotificationsTable = pgTable("member_notifications", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => membersTable.id, { onDelete: "cascade" }),
  transactionRef: text("transaction_ref").notNull(),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  direction: text("direction").notNull().$type<"credit" | "debit">(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MemberNotification = typeof memberNotificationsTable.$inferSelect;
