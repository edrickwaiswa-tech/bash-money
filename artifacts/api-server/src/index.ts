import { existsSync } from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");

if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

process.env.NODE_ENV ??= "development";

const rawPort = process.env["PORT"] ?? "5000";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

if (!process.env.DATABASE_URL) {
  const [{ default: demoApp }, { logger }] = await Promise.all([
    import("./demo-app"),
    import("./lib/logger"),
  ]);

  demoApp.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.warn(
      {
        port,
        adminEmail: "admin@bmmfs.com",
        adminPassword: "Admin123!",
        memberAccount: "BMMFS-2026-00001",
        memberPin: "1234",
      },
      "Demo API server listening because DATABASE_URL is not set",
    );
  });
} else {
const [{ default: app }, { logger }, { seedAdminAccounts }, { checkCredentials }] =
  await Promise.all([
    import("./app"),
    import("./lib/logger"),
    import("./lib/seed"),
    import("./lib/check-credentials"),
  ]);

checkCredentials();

seedAdminAccounts().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
});
}
