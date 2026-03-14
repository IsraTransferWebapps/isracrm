import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM!; // e.g. 'whatsapp:+14155238886'

const client = twilio(accountSid, authToken);

/**
 * Send a WhatsApp message via Twilio.
 * @param to - WhatsApp number, with or without 'whatsapp:' prefix
 * @param body - Message text
 * @returns Twilio message SID
 */
export async function sendWhatsAppMessage(to: string, body: string) {
  const toNumber = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  const message = await client.messages.create({
    from: whatsappFrom,
    to: toNumber,
    body,
  });

  return message.sid;
}
