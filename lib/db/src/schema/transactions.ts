import { pgTable, serial, text, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";

export const TRANSACTION_TYPES = [
  "SAVINGS_DEPOSIT",
  "LOAN_REPAYMENT",
  "LOAN_DISBURSEMENT",
  "WITHDRAWAL",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const CREDIT_TYPES: TransactionType[] = ["SAVINGS_DEPOSIT", "LOAN_REPAYMENT"];
export const DEBIT_TYPES: TransactionType[] = ["LOAN_DISBURSEMENT", "WITHDRAWAL"];

export function getDirection(type: TransactionType): "credit" | "debit" {
  return CREDIT_TYPES.includes(type) ? "credit" : "debit";
}

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionRef: text("transaction_ref").notNull().unique(),
  memberId: integer("member_id")
    .notNull()
    .references(() => membersTable.id),
  type: text("type").notNull().$type<TransactionType>(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
