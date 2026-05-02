import bcrypt from "bcrypt";
import { db, adminUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "Sacco@2024!";

async function seedAdmin() {
  const existing = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, DEFAULT_USERNAME));

  if (existing.length > 0) {
    console.log(`Admin user "${DEFAULT_USERNAME}" already exists — skipping seed.`);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  await db.insert(adminUsersTable).values({
    username: DEFAULT_USERNAME,
    passwordHash,
  });

  console.log("✓ Default admin user created:");
  console.log(`  Username: ${DEFAULT_USERNAME}`);
  console.log(`  Password: ${DEFAULT_PASSWORD}`);
  console.log("  ⚠️  Change this password after your first login.");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
