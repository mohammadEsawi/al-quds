import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { UserRole } from '../generated/prisma/client.js';

export interface TokenPayload {
  sub: string;
  role: UserRole;
  /** Issued-at, in seconds. */
  iat?: number;
}

export const TOKEN_MAX_AGE_SECONDS = Math.round(env.JWT_EXPIRES_HOURS * 3600);

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: TOKEN_MAX_AGE_SECONDS,
  });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || typeof decoded.sub !== 'string') return null;
    return {
      sub: decoded.sub,
      role: decoded['role'] as UserRole,
      ...(typeof decoded.iat === 'number' && { iat: decoded.iat }),
    };
  } catch {
    return null;
  }
}
