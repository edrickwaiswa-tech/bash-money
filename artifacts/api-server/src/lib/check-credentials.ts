import { logger } from "./logger";

export interface CredentialStatus {
  twilioReady: boolean;
  smtpReady: boolean;
  allReady: boolean;
}

const REQUIRED = [
  {
    key: "TWILIO_ACCOUNT_SID",
    label: "Twilio Account SID",
    group: "twilio",
    hint: "From https://console.twilio.com — Account Info panel",
  },
  {
    key: "TWILIO_AUTH_TOKEN",
    label: "Twilio Auth Token",
    group: "twilio",
    hint: "From https://console.twilio.com — Account Info panel",
  },
  {
    key: "TWILIO_PHONE_NUMBER",
    label: "Twilio Phone Number",
    group: "twilio",
    hint: "Your Twilio sender number, e.g. +15005550006",
  },
  {
    key: "SMTP_USER",
    label: "Brevo SMTP Login (SMTP_USER)",
    group: "smtp",
    hint: "From Brevo → SMTP & API → SMTP tab — 'Login' field",
  },
  {
    key: "SMTP_PASS",
    label: "Brevo SMTP Key (SMTP_PASS)",
    group: "smtp",
    hint: "From Brevo → SMTP & API → SMTP tab — 'Master password' or generated key",
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

  const twilioReady =
    !!process.env.TWILIO_ACCOUNT_SID?.trim() &&
    !!process.env.TWILIO_AUTH_TOKEN?.trim() &&
    !!process.env.TWILIO_PHONE_NUMBER?.trim();

  const smtpReady =
    !!process.env.SMTP_USER?.trim() &&
    !!process.env.SMTP_PASS?.trim();

  const line = "═".repeat(68);

  if (missing.length === 0) {
    logger.info("All notification credentials verified — Twilio SMS and Brevo SMTP active");
    return { twilioReady, smtpReady, allReady: true };
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

  if (!twilioReady) {
    logger.warn("Twilio SMS NOT ready — PIN reset and member OTP will use devFallback (code 123456)");
  }
  if (!smtpReady) {
    logger.warn("Brevo SMTP NOT ready — admin password reset will use devFallback (code 123456)");
  }

  return { twilioReady, smtpReady, allReady: false };
}
