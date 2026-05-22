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
  // Uganda without leading +: 256xxxxxxxx
  if (/^256\d{9}$/.test(s)) return "+" + s;
  // Already has a + — return as-is after stripping stray chars
  const digits = s.replace(/[^\d+]/g, "").replace(/\++/g, "+");
  return digits.startsWith("+") ? digits : "+" + digits;
}

/**
 * Sends an SMS via the Brevo Transactional SMS REST API.
 * Authentication uses the SMTP_PASS secret (the Brevo API key).
 *
 * Falls back to devFallback (browser alert with code 123456) when:
 *   - SMTP_PASS is absent, or
 *   - The Brevo API returns a non-2xx response.
 * Full response details are always written to console.error for inspection.
 */
export async function sendSms(params: {
  to: string;
  body: string;
  code: string;
}): Promise<SmsDelivery> {
  const { to: rawTo, body, code } = params;

  const apiKey = process.env.SMTP_PASS?.trim();

  if (!apiKey) {
    logger.warn({ to: rawTo }, "Brevo API key (SMTP_PASS) missing — devFallback active");
    return { delivered: false, devFallback: true, notificationCode: code };
  }

  const recipient = toE164(rawTo);

  logger.info({ to: recipient }, "Attempting Brevo SMS dispatch");

  try {
    const response = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
      method: "POST",
      headers: {
        "accept":       "application/json",
        "content-type": "application/json",
        "api-key":      apiKey,
      },
      body: JSON.stringify({
        sender:    "BMMFS",
        recipient,
        content:   body,
      }),
    });

    if (response.ok) {
      const data = await response.json() as Record<string, unknown>;
      logger.info({ to: recipient, messageId: data.messageId }, "SMS delivered via Brevo");
      return { delivered: true };
    }

    // Non-2xx — log the full response body for diagnosis
    let errorBody: unknown;
    try { errorBody = await response.json(); } catch { errorBody = await response.text(); }
    console.error("Brevo SMS Error:", {
      to:         recipient,
      httpStatus: response.status,
      body:       errorBody,
    });
    logger.error(
      { to: recipient, httpStatus: response.status },
      "Brevo SMS delivery failed — devFallback active"
    );
    return { delivered: false, devFallback: true, notificationCode: code };

  } catch (err: unknown) {
    console.error("Brevo SMS network error:", { to: recipient, err });
    logger.error({ to: recipient, err }, "Brevo SMS network error — devFallback active");
    return { delivered: false, devFallback: true, notificationCode: code };
  }
}
