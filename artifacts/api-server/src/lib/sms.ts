import { logger } from "./logger";

export type SmsDelivery =
  | { delivered: true }
  | { delivered: false };

/**
 * Normalises any phone number to strict E.164 format.
 * Handles Ugandan local format (07xxxxxxxx → +2567xxxxxxxx) as well as
 * standard international numbers with or without the leading +.
 */
function toE164(raw: string): string {
  const s = raw.replace(/[\s\-().]/g, "");
  // Uganda local: 07xxxxxxxx (10 digits starting with 0)
  if (/^0\d{9}$/.test(s)) return "+256" + s.slice(1);
  // Uganda without leading +: 256xxxxxxxx
  if (/^256\d{9}$/.test(s)) return "+" + s;
  // Already has + or other international format
  const digits = s.replace(/[^\d+]/g, "").replace(/\++/g, "+");
  return digits.startsWith("+") ? digits : "+" + digits;
}

/**
 * Sends an SMS via the Twilio API.
 * Credentials come from:
 *   TWILIO_ACCOUNT_SID  — Account Info panel in Twilio Console
 *   TWILIO_AUTH_TOKEN   — Account Info panel in Twilio Console
 *   TWILIO_PHONE_NUMBER — Your Twilio sender number (E.164)
 *
 * Returns { delivered: false } on any failure — the caller is responsible
 * for returning an appropriate HTTP error (no silent 123456 fallback).
 * Full Twilio error details are always written to console.error.
 */
export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<SmsDelivery> {
  const { to: rawTo, body } = params;

  const sid   = process.env.TWILIO_ACCOUNT_SID?.trim();
  const auth  = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from  = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!sid || !auth || !from) {
    logger.warn({ to: rawTo }, "Twilio credentials missing — SMS not sent");
    return { delivered: false };
  }

  const to = toE164(rawTo);
  logger.info({ to, from }, "Attempting Twilio SMS dispatch");

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(sid, auth);

    const message = await client.messages.create({ body, from, to });

    logger.info({ to, from, sid: message.sid, status: message.status }, "SMS delivered via Twilio");
    return { delivered: true };

  } catch (err: any) {
    // Log the full Twilio error object for diagnosis in Replit logs
    console.error("Twilio SMS Error:", {
      to,
      from,
      errorCode:  err?.code,
      httpStatus: err?.status,
      message:    err?.message,
      moreInfo:   err?.moreInfo,
    });
    logger.error(
      { to, twilioCode: err?.code, twilioStatus: err?.status, twilioMessage: err?.message },
      "Twilio SMS delivery failed"
    );
    return { delivered: false };
  }
}
