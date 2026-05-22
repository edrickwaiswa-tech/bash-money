import { logger } from "./logger";

export type SmsDelivery =
  | { delivered: true }
  | { delivered: false; devFallback: true; notificationCode: string };

/**
 * Normalises any phone number to strict E.164 format.
 * Strips all whitespace, hyphens, parentheses and dots.
 * Ensures the result begins with exactly one '+'.
 * Examples:
 *   "+256 746 724 455"  → "+256746724455"
 *   "256-746-724-455"   → "+256746724455"
 *   "+1 912-937-6433"   → "+19129376433"
 */
function toE164(raw: string): string {
  // Remove every character that is not a digit or a leading '+'
  let digits = raw.replace(/[^\d+]/g, "");
  // Collapse multiple '+' signs and ensure exactly one at the front
  digits = digits.replace(/\++/g, "+");
  if (!digits.startsWith("+")) {
    digits = "+" + digits;
  }
  return digits;
}

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
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!sid || !auth || !from) {
    logger.warn({ to: rawTo }, "Twilio not configured — devFallback active");
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
