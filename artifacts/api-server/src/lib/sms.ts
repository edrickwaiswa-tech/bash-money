import { logger } from "./logger";

export type SmsDelivery =
  | { delivered: true }
  | { delivered: false; devFallback: true; notificationCode: string };

/**
 * Sends an SMS via Twilio when credentials are present.
 * Falls back to a browser-notification signal (devFallback) when:
 *   - Twilio is not configured, or
 *   - The destination number is outside the Twilio trial sandbox (error 21608).
 *
 * The raw `code` is NEVER written to server logs.
 */
export async function sendSms(params: {
  to: string;
  body: string;
  code: string;
}): Promise<SmsDelivery> {
  const { to, body, code } = params;
  const sid  = process.env.TWILIO_ACCOUNT_SID;
  const auth = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (sid && auth && from) {
    try {
      const { default: twilio } = await import("twilio");
      const client = twilio(sid, auth);
      await client.messages.create({ body, from, to });
      logger.info({ to }, "SMS delivered via Twilio");
      return { delivered: true };
    } catch (err: any) {
      const twilioCode: number | undefined = err?.code;
      // 21608 = unverified number on trial; 21211 = invalid number
      const isSandboxRestriction = twilioCode === 21608 || twilioCode === 21211;
      if (isSandboxRestriction) {
        logger.warn({ to, twilioCode }, "Twilio sandbox restriction — activating browser notification fallback");
      } else {
        logger.error({ to, twilioCode, message: err?.message }, "Twilio SMS delivery failed — activating browser notification fallback");
      }
      return { delivered: false, devFallback: true, notificationCode: code };
    }
  }

  logger.warn({ to }, "Twilio not configured — browser notification fallback active");
  return { delivered: false, devFallback: true, notificationCode: code };
}
