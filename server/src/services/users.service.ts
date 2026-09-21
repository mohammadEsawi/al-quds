import type { UserRole } from '../generated/prisma/client.js';
import { AppError } from '../lib/errors.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { prisma } from '../lib/prisma.js';

const select = { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, totpEnabledAt: true } as const;

const present = <T extends { totpEnabledAt: Date | null }>({ totpEnabledAt, ...user }: T) => ({ ...user, twoFactorEnabled: totpEnabledAt !== null });

export const listUsers = async () => (await prisma.user.findMany({ select, orderBy: { createdAt: 'asc' } })).map(present);

export async function createUser(input: { email: string; name: string; password: string; role: UserRole }) {
  return present(
    await prisma.user.create({
      data: { email: input.email, name: input.name, role: input.role, passwordHash: await hashPassword(input.password) },
      select,
    }),
  );
}

async function activeSuperAdmins(exceptId: string) {
  return prisma.user.count({ where: { role: 'SUPER_ADMIN', isActive: true, NOT: { id: exceptId } } });
}

export async function updateUser(
  id: string,
  actorId: string,
  input: { name?: string; role?: UserRole; isActive?: boolean; password?: string; resetTwoFactor?: boolean },
) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw AppError.notFound('User not found', 'USER_NOT_FOUND');

  // Never leave the platform without an active super admin.
  const losesSuperAdmin = target.role === 'SUPER_ADMIN' && (input.role && input.role !== 'SUPER_ADMIN' || input.isActive === false);
  if (losesSuperAdmin && (await activeSuperAdmins(id)) === 0) {
    throw AppError.badRequest('At least one active super admin is required', 'LAST_SUPER_ADMIN');
  }
  if (id === actorId && input.isActive === false) throw AppError.badRequest('You cannot deactivate your own account', 'SELF_DEACTIVATE');

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(input.resetTwoFactor && { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null, recoveryCodes: null, passwordChangedAt: new Date() }),
      ...(input.name && { name: input.name }),
      ...(input.role && { role: input.role }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.password && { passwordHash: await hashPassword(input.password), passwordChangedAt: new Date() }),
    },
    select,
  });
  return present(updated);
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) throw AppError.badRequest('You cannot delete your own account', 'SELF_DELETE');
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw AppError.notFound('User not found', 'USER_NOT_FOUND');
  if (target.role === 'SUPER_ADMIN' && (await activeSuperAdmins(id)) === 0) {
    throw AppError.badRequest('At least one active super admin is required', 'LAST_SUPER_ADMIN');
  }
  await prisma.user.delete({ where: { id } });
}

export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) {
    throw AppError.badRequest('The current password is incorrect', 'INVALID_CURRENT_PASSWORD');
  }
  return prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(newPassword), passwordChangedAt: new Date() },
    select: { id: true, role: true },
  });
}
