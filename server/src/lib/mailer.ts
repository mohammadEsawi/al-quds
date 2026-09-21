import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env.js';

export const emailConfigured = () => Boolean(env.SMTP_HOST && env.MAIL_FROM);

let transport: Transporter | undefined;

function getTransport(): Transporter {
  transport ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } }),
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transport;
}

/** Header values must be a single line: strip anything that could start a new header. */
const LINE_BREAKS = new RegExp(`[${String.fromCharCode(13, 10, 0x2028, 0x2029)}]+`, 'g');
const oneLine = (value: string, max = 200) => value.replace(LINE_BREAKS, ' ').trim().slice(0, max);

export interface MailInput {
  to: string[];
  subject: string;
  text: string;
  html: string;
  /** Where a reply should go (an address the visitor typed, already validated as an email). */
  replyTo?: string;
}

export async function sendMail({ to, subject, text, html, replyTo }: MailInput): Promise<void> {
  if (!emailConfigured()) throw new Error('Email is not configured');
  await getTransport().sendMail({
    from: env.MAIL_FROM,
    to,
    subject: oneLine(subject),
    text,
    html,
    ...(replyTo && { replyTo: oneLine(replyTo, 254) }),
  });
}

export const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
