import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../generated/prisma/client.js';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  /** Issued-at, in seconds. */
  iat?: number;
  /** Unique token id, used to revoke a session on logout. */
  jti?: string;
  /** Expiry, in seconds. */
  exp?: number;
  /** Exact time the token was issued, in milliseconds (`iat` only has whole seconds). */
  at?: number;
}

export const TOKEN_MAX_AGE_SECONDS = Math.round(env.JWT_EXPIRES_HOURS * 3600);

export function signToken(payload: Pick<TokenPayload, 'sub' | 'role'>): string {
  return jwt.sign({ ...payload, at: Date.now() }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_MAX_AGE_SECONDS,
    jwtid: randomUUID(),
  });
}

const MFA_AUDIENCE = 'lamico-mfa';

/** Proof that the password was correct; only good for submitting the second factor, for 5 minutes. */
export function signMfaToken(sub: string): string {
  return jwt.sign({ purpose: 'mfa' }, env.JWT_SECRET, { algorithm: 'HS256', expiresIn: 300, audience: MFA_AUDIENCE, subject: sub });
}

export function verifyMfaToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'], audience: MFA_AUDIENCE });
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string' || decoded['purpose'] !== 'mfa') return null;
    return decoded.sub;
  } catch {
    return null;
  }
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') return null;
    // A password-only (MFA step) token must never be accepted as a logged-in session.
    if (decoded.aud || decoded['purpose']) return null;
    return {
      sub: decoded.sub,
      role: decoded['role'] as UserRole,
      ...(typeof decoded.iat === 'number' && { iat: decoded.iat }),
      ...(typeof decoded.jti === 'string' && { jti: decoded.jti }),
      ...(typeof decoded.exp === 'number' && { exp: decoded.exp }),
      ...(typeof decoded['at'] === 'number' && { at: decoded['at'] }),
    };
  } catch {
    return null;
  }
}
