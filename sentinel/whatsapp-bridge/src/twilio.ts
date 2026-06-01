/**
 * Twilio WhatsApp send — minimal client.
 *
 * Uses the REST API directly (no twilio-node SDK) so this file works
 * unchanged in Node, Deno, and Supabase Edge Functions when we move there.
 *
 * Sandbox vs. production:
 *   - Sandbox FROM number: 'whatsapp:+14155238886' (Twilio's shared sandbox)
 *   - Production FROM:     your own approved WhatsApp Business number
 * The function doesn't care which — set TWILIO_WHATSAPP_FROM in env.
 */

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** "whatsapp:+14155238886" for Sandbox; your business number for production. */
  fromNumber: string;
}

export interface SendResult {
  success: boolean;
  twilioSid?: string;
  errorCode?: number;
  errorMessage?: string;
}

/**
 * Send a WhatsApp text message via Twilio.
 *
 * @param to E.164 phone number with country code, no plus, e.g. "256701234567"
 *           or already-formatted "whatsapp:+256701234567".
 * @param body Message text. Must be ≤ 4096 chars (renderAdvisory handles this).
 */
export async function sendWhatsApp(
  cfg: TwilioConfig,
  to: string,
  body: string
): Promise<SendResult> {
  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:+${to.replace(/^\+/, "")}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`;
  const authHeader =
    "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");

  const formBody = new URLSearchParams({
    From: cfg.fromNumber,
    To: toFormatted,
    Body: body,
  }).toString();

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formBody,
    });

    const payload = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      return {
        success: false,
        errorCode: typeof payload.code === "number" ? payload.code : response.status,
        errorMessage:
          typeof payload.message === "string"
            ? payload.message
            : `HTTP ${response.status}`,
      };
    }
    return {
      success: true,
      twilioSid: typeof payload.sid === "string" ? payload.sid : undefined,
    };
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Load TwilioConfig from environment. Throws if anything is missing. */
export function loadTwilioConfigFromEnv(): TwilioConfig {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      "WhatsApp bridge requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM in environment. " +
        "See sentinel/whatsapp-bridge/README.md for setup."
    );
  }
  return { accountSid, authToken, fromNumber };
}
