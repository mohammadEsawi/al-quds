import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/** RFC 6238 time-based one-time passwords (what Google Authenticator, Microsoft Authenticator, Authy... use). */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const PERIOD_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 character');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A fresh 160-bit secret, base32 encoded (the format authenticator apps expect). */
export const generateTotpSecret = () => base32Encode(randomBytes(20));

/** The code for one 30-second step. `algorithm` exists so the RFC test vectors (SHA-256/512) can be checked. */
export function totpForStep(secretBase32: string, step: number, algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1', digits = DIGITS): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac(algorithm, base32Decode(secretBase32)).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary = ((hmac[offset]! & 0x7f) << 24) | (hmac[offset + 1]! << 16) | (hmac[offset + 2]! << 8) | hmac[offset + 3]!;
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export const stepAt = (timeMs: number) => Math.floor(timeMs / 1000 / PERIOD_SECONDS);

/**
 * Checks a code against the current step and one step either side (clock drift).
 * Returns the step that matched, or null. A step at or below `lastUsedStep` is refused, so a code
 * that was already used (or shoulder-surfed) cannot be replayed.
 */
export function verifyTotp(secretBase32: string, code: string, lastUsedStep: number | null = null, timeMs = Date.now()): number | null {
  const submitted = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(submitted)) return null;
  const now = stepAt(timeMs);
  for (const step of [now - 1, now, now + 1]) {
    if (lastUsedStep !== null && step <= lastUsedStep) continue;
    const expected = Buffer.from(totpForStep(secretBase32, step));
    if (timingSafeEqual(expected, Buffer.from(submitted))) return step;
  }
  return null;
}

export function otpauthUrl(account: string, secretBase32: string, issuer: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD_SECONDS}`;
}
