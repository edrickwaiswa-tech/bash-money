import { logger } from "./logger";

export interface CredentialStatus {
  brevoSmsReady: boolean;
  smtpReady: boolean;
  allReady: boolean;
}

const REQUIRED = [
  {
    key: "SMTP_USER",
    label: "Brevo Login (SMTP_USER)",
    group: "smtp",
    hint: "From Brevo → SMTP & API → SMTP tab — 'Login' field",
  },
  {
    key: "SMTP_PASS",
    label: "Brevo API Key (SMTP_PASS) — used for both SMS and SMTP",
    group: "smtp",
    hint: "From Brevo → SMTP & API → API Keys tab",
  },
] as const;

export function checkCredentials(): CredentialStatus {
  const missing: typeof REQUIRED[number][] = [];
  const present: string[] = [];

  for (const cred of REQUIRED) {
    const val = process.env[cred.key];
    if (!val || val.trim() === "") {
      missing.push(cred);
    } else {
      present.push(cred.key);
    }
  }

  const brevoSmsReady = !!process.env.SMTP_PASS?.trim();

  const smtpReady =
    !!process.env.SMTP_USER?.trim() &&
    !!process.env.SMTP_PASS?.trim();

  const line = "═".repeat(68);

  if (missing.length === 0) {
    logger.info("All notification credentials verified — Brevo SMS and SMTP active");
    return { brevoSmsReady, smtpReady, allReady: true };
  }

  // Print a highly visible block to the server console
  console.error(`\n${line}`);
  console.error(`  BMMFS — Configuration Required`);
  console.error(`  ${missing.length} credential(s) missing. Real delivery will NOT work.`);
  console.error(line);
  for (const cred of missing) {
    console.error(`  ✗ MISSING  ${cred.key}`);
    console.error(`             ${cred.label}`);
    console.error(`             ${cred.hint}`);
    console.error("");
  }
  if (present.length > 0) {
    console.error(`  ✓ Present: ${present.join(", ")}`);
  }
  console.error(`\n  Add the missing keys in the Replit Secrets panel (padlock icon).`);
  console.error(`  Exact key names to use:`);
  for (const cred of REQUIRED) {
    console.error(`    ${cred.key}`);
  }
  console.error(`\n  Until all keys are present, the app uses the testing fallback:`);
  console.error(`  Code 123456 is shown via browser alert — real SMS/email is skipped.`);
  console.error(`${line}\n`);

  if (!brevoSmsReady) {
    logger.warn("Brevo SMS NOT ready — PIN reset and member OTP will use devFallback (code 123456)");
  }
  if (!smtpReady) {
    logger.warn("Brevo SMTP NOT ready — admin password reset will use devFallback (code 123456)");
  }

  return { brevoSmsReady, smtpReady, allReady: false };
}
