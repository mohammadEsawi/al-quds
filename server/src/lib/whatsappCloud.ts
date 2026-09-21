import { env } from '../config/env.js';

export const whatsappConfigured = () => Boolean(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_ID);

/** Template parameters may not contain new lines, tabs or runs of spaces. */
const param = (value: string) => value.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 900);

/**
 * Sends a short WhatsApp message through the Meta WhatsApp Cloud API.
 * Meta only allows a free-form text to a number that wrote to the business in the last 24 hours;
 * to reach the owner at any time, create an approved message template and set WHATSAPP_TEMPLATE
 * (its body then takes two parameters: the headline and a one-line summary).
 */
export async function sendWhatsApp(toDigits: string, headline: string, summary: string): Promise<void> {
  if (!whatsappConfigured()) throw new Error('WhatsApp is not configured');

  const payload = env.WHATSAPP_TEMPLATE
    ? {
        messaging_product: 'whatsapp',
        to: toDigits,
        type: 'template',
        template: {
          name: env.WHATSAPP_TEMPLATE,
          language: { code: env.WHATSAPP_TEMPLATE_LANG },
          components: [{ type: 'body', parameters: [{ type: 'text', text: param(headline) }, { type: 'text', text: param(summary) }] }],
        },
      }
    : { messaging_product: 'whatsapp', to: toDigits, type: 'text', text: { body: `${headline}\n${summary}`.slice(0, 1500) } };

  const response = await fetch(`${env.WHATSAPP_API_URL}/${encodeURIComponent(env.WHATSAPP_PHONE_ID ?? '')}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    // Meta's error text is useful and contains no secrets; the token is never logged.
    const detail = (await response.text().catch(() => '')).slice(0, 200);
    throw new Error(`WhatsApp API answered ${response.status} ${detail}`);
  }
}
