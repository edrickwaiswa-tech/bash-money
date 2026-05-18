import { pgTable, serial, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  accountNumber: text("account_number").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  idNumber: text("id_number").notNull().unique(),
  joinDate: text("join_date").notNull(),
  profilePictureUrl: text("profile_picture_url"),
  signatureUrl: text("signature_url"),
  memberPinHash: text("member_pin_hash"),
  requiresPasswordReset: boolean("requires_password_reset").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMemberSchema = createInsertSchema(membersTable).omit({
  id: true,
  createdAt: true,
  accountNumber: true,
  profilePictureUrl: true,
  signatureUrl: true,
});

export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;
