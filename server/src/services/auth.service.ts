import { randomBytes } from 'node:crypto';
import { AppError } from '../lib/errors.js';
import { signMfaToken, signToken } from '../lib/jwt.js';
import { twoFactorRequired } from '../middleware/auth.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import type { LoginInput } from '../validators/auth.validators.js';

// Verifying against a throwaway hash when the user does not exist keeps the
// response time similar, so login cannot be used to discover valid emails.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));

const invalidCredentials = () =>
  AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

const publicUser = (user: { id: string; email: string; name: string; role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR'; totpEnabledAt: Date | null }) => {
  const twoFactorEnabled = user.totpEnabledAt !== null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    twoFactorEnabled,
    twoFactorRequired: twoFactorRequired({ role: user.role, twoFactorEnabled }),
  };
};

/**
 * Checks the password. Users without two-factor get a session token; users with it get a short-lived
 * "password ok" token that is only good for submitting the code (see completeTwoFactorLogin).
 */
export async function login({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await verifyPassword(await getDummyHash(), password);
    throw invalidCredentials();
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid || !user.isActive) throw invalidCredentials();

  if (user.totpEnabledAt) return { kind: 'mfa' as const, mfaToken: signMfaToken(user.id), userId: user.id };

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { kind: 'session' as const, token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) };
}

/** Second step of a login, after the code was verified. */
export async function completeTwoFactorLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) throw invalidCredentials();
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { token: signToken({ sub: user.id, role: user.role }), user: publicUser(user) };
}
