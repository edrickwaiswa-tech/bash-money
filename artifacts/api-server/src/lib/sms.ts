import { logger } from "./logger";

export type SmsDelivery =
  | { delivered: true }
  | { delivered: false; devFallback: true; notificationCode: string };

/**
 * Normalises any phone number to strict E.164 format.
 * Handles Ugandan local format (07xxxxxxxx → +2567xxxxxxxx) as well as
 * standard international numbers with or without the leading +.
 */
function toE164(raw: string): string {
  const s = raw.replace(/[\s\-().]/g, "");
  // Uganda local: 07xxxxxxxx (10 digits starting with 0)
  if (/^0\d{9}$/.test(s)) return "+256" + s.slice(1);
  // Uganda without country code +: 256xxxxxxxx
  if (/^256\d{9}$/.test(s)) return "+" + s;
  // Strip all non-digit/+ characters and ensure a single leading +
  const digits = s.replace(/[^\d+]/g, "").replace(/\++/g, "+");
  return digits.startsWith("+") ? digits : "+" + digits;
}

// Twilio trial number fallback — used only if TWILIO_PHONE_NUMBER is absent
const TWILIO_FALLBACK_FROM = "+19129376433";

/**
 * Sends an SMS via Twilio.
 * Falls back to devFallback (browser alert with code 123456) when:
 *   - Twilio credentials are absent, or
 *   - The Twilio API call fails for any reason.
 * Full error details are always written to console.error for inspection.
 */
export async function sendSms(params: {
  to: string;
  body: string;
  code: string;
}): Promise<SmsDelivery> {
  const { to: rawTo, body, code } = params;

  const sid  = process.env.TWILIO_ACCOUNT_SID?.trim();
  const auth = process.env.TWILIO_AUTH_TOKEN?.trim();
  // Use env var if set; fall back to the known trial number so the env var
  // being absent never silently breaks dispatch.
  const from = process.env.TWILIO_PHONE_NUMBER?.trim() || TWILIO_FALLBACK_FROM;

  if (!sid || !auth) {
    logger.warn({ to: rawTo }, "Twilio credentials missing — devFallback active");
    return { delivered: false, devFallback: true, notificationCode: code };
  }

  // Enforce strict E.164 on both the sender and recipient numbers
  const toE164Number   = toE164(rawTo);
  const fromE164Number = toE164(from);

  logger.info({ to: toE164Number, from: fromE164Number }, "Attempting Twilio SMS dispatch");

  try {
    const { default: twilio } = await import("twilio");
    const client = twilio(sid, auth);

    const message = await client.messages.create({
      body,
      from: fromE164Number,
      to:   toE164Number,
    });

    logger.info({ to: toE164Number, sid: message.sid, status: message.status }, "SMS delivered via Twilio");
    return { delivered: true };

  } catch (err: any) {
    const twilioCode: number | undefined = err?.code;
    const twilioStatus: number | undefined = err?.status;
    const twilioMessage: string | undefined = err?.message;
    const moreInfo: string | undefined = err?.moreInfo;

    // Print full error details to console so they appear clearly in Replit logs
    console.error("Twilio Error Details:", {
      to:          toE164Number,
      from:        fromE164Number,
      errorCode:   twilioCode,
      httpStatus:  twilioStatus,
      message:     twilioMessage,
      moreInfo,
    });

    logger.error(
      { to: toE164Number, twilioCode, twilioStatus, twilioMessage },
      "Twilio SMS delivery failed — devFallback active"
    );

    return { delivered: false, devFallback: true, notificationCode: code };
  }
}
