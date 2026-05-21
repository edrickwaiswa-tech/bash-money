import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";
import { db, adminUsersTable } from "@workspace/db";
import { logger } from "./logger";

const ADMIN_ACCOUNTS = [
  {
    email: "kakembob1@gmail.com",
    username: "kakembob1@gmail.com",
    fullName: "Kakembo",
    password: "BashM2026!",
  },
  {
    email: "edrickwaiswa@gmail.com",
    username: "admin",
    fullName: "Edrick Waiswa",
    password: "Admin123!",
  },
  {
    email: "admin@bmmfs.com",
    username: "admin@bmmfs.com",
    fullName: "BMMFS Admin",
    password: "Admin123!",
  },
];

export async function seedAdminAccounts(): Promise<void> {
  try {
    for (const account of ADMIN_ACCOUNTS) {
      const existing = await db
        .select({ id: adminUsersTable.id })
        .from(adminUsersTable)
        .where(
          or(
            eq(adminUsersTable.email, account.email),
            eq(adminUsersTable.username, account.username),
          ),
        );

      if (existing.length === 0) {
        const passwordHash = await bcrypt.hash(account.password, 12);
        await db.insert(adminUsersTable).values({
          email: account.email,
          username: account.username,
          fullName: account.fullName,
          passwordHash,
        });
        logger.info({ email: account.email }, "Seeded admin account");
      } else {
        const passwordHash = await bcrypt.hash(account.password, 12);
        await db
          .update(adminUsersTable)
          .set({ passwordHash, pinHash: null })
          .where(eq(adminUsersTable.email, account.email));
        logger.info({ email: account.email }, "Verified admin account password");
      }
    }
  } catch (err) {
    logger.error({ err }, "seedAdminAccounts failed");
  }
}
