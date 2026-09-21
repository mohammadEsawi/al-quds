import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Encrypts small secrets (authenticator keys) before they go into the database, so a copy of the database
 * alone is not enough to generate login codes. AES-256-GCM; the stored text is `v1.iv.tag.ciphertext` (base64url).
 */
function loadKey(): Buffer {
  const configured = env.DATA_ENCRYPTION_KEY?.trim();
  if (configured) {
    const key = /^[0-9a-f]{64}$/i.test(configured) ? Buffer.from(configured, 'hex') : Buffer.from(configured, 'base64');
    if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes (64 hex characters, or base64).');
    return key;
  }
  // No dedicated key: derive one from the JWT secret (so changing JWT_SECRET would lock everyone out of 2FA — set the key to avoid that).
  return Buffer.from(hkdfSync('sha256', env.JWT_SECRET, 'lamico', 'totp-secret-encryption', 32));
}

const key = loadKey();

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), data.toString('base64url')].join('.');
}

export function open(sealed: string): string {
  const [version, iv, tag, data] = sealed.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported secret format');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
