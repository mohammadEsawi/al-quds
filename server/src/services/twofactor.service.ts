import { createHash, randomBytes } from 'node:crypto';
import QRCode from 'qrcode';
import { AppError } from '../lib/errors.js';
import { verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';
import { open, seal } from '../lib/secretBox.js';
import { generateTotpSecret, otpauthUrl, verifyTotp } from '../lib/totp.js';

const ISSUER = 'Lamico';
const RECOVERY_CODES = 10;

const hashCode = (code: string) => createHash('sha256').update(code.toLowerCase().replace(/[^a-z0-9]/g, '')).digest('hex');
const newRecoveryCode = () => {
  const raw = randomBytes(5).toString('hex'); // 10 hex characters
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
};

/** Step 1 of setup: creates a secret and returns what the authenticator app needs (QR code + manual key). */
export async function beginSetup(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();
  if (user.totpEnabledAt) throw AppError.badRequest('Two-factor login is already on', 'TWO_FACTOR_ALREADY_ENABLED');

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: userId }, data: { totpSecretEnc: seal(secret), totpEnabledAt: null, totpLastStep: null, recoveryCodes: null } });

  const url = otpauthUrl(user.email, secret, ISSUER);
  return { secret, otpauthUrl: url, qrDataUrl: await QRCode.toDataURL(url, { margin: 1, width: 240 }) };
}

/** Step 2: the user types the first code from the app, which proves the secret was scanned. Returns the recovery codes (shown once). */
export async function confirmSetup(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecretEnc || user.totpEnabledAt) throw AppError.badRequest('Start the setup first', 'TWO_FACTOR_NOT_STARTED');

  const step = verifyTotp(open(user.totpSecretEnc), code, null);
  if (step === null) throw AppError.badRequest('The code is not correct', 'INVALID_TWO_FACTOR_CODE');

  const recoveryCodes = Array.from({ length: RECOVERY_CODES }, newRecoveryCode);
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabledAt: new Date(), totpLastStep: step, recoveryCodes: JSON.stringify(recoveryCodes.map(hashCode)) },
  });
  return { recoveryCodes };
}

export type SecondFactorMethod = 'totp' | 'recovery';

/**
 * Checks a login code: a 6-digit authenticator code (each 30-second step works once) or one of the
 * recovery codes (each works once). Returns how it was satisfied, or null.
 */
export async function verifySecondFactor(userId: string, code: string): Promise<SecondFactorMethod | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecretEnc || !user.totpEnabledAt) return null;

  const step = verifyTotp(open(user.totpSecretEnc), code, user.totpLastStep);
  if (step !== null) {
    // Only advance if nobody else did in the meantime, so two parallel requests cannot both use the same code.
    const claimed = await prisma.user.updateMany({
      where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
      data: { totpLastStep: step },
    });
    return claimed.count === 1 ? 'totp' : null;
  }

  if (!/^[a-z0-9]{5}-?[a-z0-9]{5}$/i.test(code.trim())) return null;
  const hashes: string[] = user.recoveryCodes ? JSON.parse(user.recoveryCodes) : [];
  const hash = hashCode(code);
  if (!hashes.includes(hash)) return null;
  const claimed = await prisma.user.updateMany({
    where: { id: userId, recoveryCodes: user.recoveryCodes },
    data: { recoveryCodes: JSON.stringify(hashes.filter((h) => h !== hash)) },
  });
  return claimed.count === 1 ? 'recovery' : null;
}

/** Turning it off needs both the password and a current code, so a stolen session alone cannot remove it. */
export async function disable(userId: string, password: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpEnabledAt) throw AppError.badRequest('Two-factor login is not on', 'TWO_FACTOR_NOT_ENABLED');
  if (!(await verifyPassword(user.passwordHash, password))) throw AppError.badRequest('The password is incorrect', 'INVALID_CURRENT_PASSWORD');
  if (!(await verifySecondFactor(userId, code))) throw AppError.badRequest('The code is not correct', 'INVALID_TWO_FACTOR_CODE');
  await prisma.user.update({ where: { id: userId }, data: { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null, recoveryCodes: null } });
}

export async function remainingRecoveryCodes(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { recoveryCodes: true } });
  return user?.recoveryCodes ? (JSON.parse(user.recoveryCodes) as string[]).length : 0;
}
