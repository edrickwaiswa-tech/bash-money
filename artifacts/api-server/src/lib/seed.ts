import bcrypt from "bcrypt";
import { db, adminUsersTable } from "@workspace/db";
import { logger } from "./logger";

const ADMIN_ACCOUNTS = [
  {
    username: "kakembob1@gmail.com",
    email: "kakembob1@gmail.com",
    fullName: "Kakembo",
    password: "BashM2026!",
  },
  {
    username: "admin",
    email: "edrickwaiswa@gmail.com",
    fullName: "Edrick Waiswa",
    password: "Admin123!",
  },
  {
    username: "admin@bmmfs.com",
    email: "admin@bmmfs.com",
    fullName: "BMMFS Admin",
    password: "Admin123!",
  },
];

export async function seedAdminAccounts(): Promise<void> {
  for (const account of ADMIN_ACCOUNTS) {
    try {
      const passwordHash = await bcrypt.hash(account.password, 12);

      await db
        .insert(adminUsersTable)
        .values({
          username: account.username,
          email: account.email,
          fullName: account.fullName,
          passwordHash,
        })
        .onConflictDoUpdate({
          target: adminUsersTable.username,
          set: {
            email: account.email,
            passwordHash,
            pinHash: null,
          },
        });

      logger.info({ email: account.email, username: account.username }, "Admin account seeded");
    } catch (err) {
      logger.error({ err, email: account.email }, "seedAdminAccounts — failed for account");
    }
  }
}
