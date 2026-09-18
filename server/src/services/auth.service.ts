import { randomBytes } from 'node:crypto';
import { AppError } from '../lib/errors.js';
import { signToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import type { LoginInput } from '../validators/auth.validators.js';

// Verifying against a throwaway hash when the user does not exist keeps the
// response time similar, so login cannot be used to discover valid emails.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString('hex')));

const invalidCredentials = () =>
  AppError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

export async function login({ email, password }: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await verifyPassword(await getDummyHash(), password);
    throw invalidCredentials();
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid || !user.isActive) throw invalidCredentials();

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    token: signToken({ sub: user.id, role: user.role }),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}
