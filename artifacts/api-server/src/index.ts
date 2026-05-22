import app from "./app";
import { logger } from "./lib/logger";
import { seedAdminAccounts } from "./lib/seed";
import { checkCredentials } from "./lib/check-credentials";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Check notification credentials on startup and log any missing keys
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
