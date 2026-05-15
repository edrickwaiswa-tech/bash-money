import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
import { adminUsersTable } from "./admin-users";

export const adminLoginRequestsTable = pgTable("admin_login_requests", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => adminUsersTable.id),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
});

export const adminSecurityLogsTable = pgTable("admin_security_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => adminUsersTable.id),
  email: text("email").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  action: text("action").notNull(),
  requestToken: text("request_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AdminLoginRequest = typeof adminLoginRequestsTable.$inferSelect;
export type AdminSecurityLog = typeof adminSecurityLogsTable.$inferSelect;
