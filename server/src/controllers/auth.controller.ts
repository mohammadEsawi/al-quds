import type { CookieOptions, RequestHandler } from 'express';
import { isProduction } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { signToken, TOKEN_MAX_AGE_SECONDS, verifyMfaToken, verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { AUTH_COOKIE, twoFactorRequired } from '../middleware/auth.js';
import { auditRequest } from '../services/audit.service.js';
import * as authService from '../services/auth.service.js';
import * as twoFactor from '../services/twofactor.service.js';
import { changeOwnPassword } from '../services/users.service.js';
import type { LoginInput } from '../validators/auth.validators.js';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
};

const startSession = (res: Parameters<RequestHandler>[1], token: string) =>
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: TOKEN_MAX_AGE_SECONDS * 1000 });

export const login: RequestHandler = async (req, res) => {
  const { email } = req.body as LoginInput;
  let result;
  try {
    result = await authService.login(req.body as LoginInput);
  } catch (error) {
    if (error instanceof AppError && error.status === 401) void auditRequest(req, { action: 'auth login failed', actorEmail: email, status: 401 });
    throw error;
  }
  if (result.kind === 'mfa') {
    // Password is right; the session only starts once the code has been checked.
    void auditRequest(req, { action: 'auth login password ok, code pending', actorId: result.userId, actorEmail: email, status: 200 });
    res.json({ mfaRequired: true, mfaToken: result.mfaToken });
    return;
  }
  void auditRequest(req, { action: 'auth login', actorId: result.user.id, actorEmail: result.user.email, status: 200 });
  startSession(res, result.token);
  res.json({ user: result.user });
};

export const loginTwoFactor: RequestHandler = async (req, res) => {
  const { mfaToken, code } = req.body as { mfaToken: string; code: string };
  const userId = verifyMfaToken(mfaToken);
  if (!userId) throw AppError.unauthorized('The sign-in expired, start again', 'MFA_EXPIRED');

  const method = await twoFactor.verifySecondFactor(userId, code);
  if (!method) {
    void auditRequest(req, { action: 'auth 2fa failed', actorId: userId, status: 401 });
    throw AppError.unauthorized('The code is not correct', 'INVALID_TWO_FACTOR_CODE');
  }
  const result = await authService.completeTwoFactorLogin(userId);
  void auditRequest(req, { action: `auth login (2fa ${method})`, actorId: result.user.id, actorEmail: result.user.email, status: 200 });
  startSession(res, result.token);
  res.json({ user: result.user });
};

export const twoFactorSetup: RequestHandler = async (req, res) => {
  res.json(await twoFactor.beginSetup(req.user!.id));
};

export const twoFactorEnable: RequestHandler = async (req, res) => {
  const { code } = req.body as { code: string };
  const result = await twoFactor.confirmSetup(req.user!.id, code);
  void auditRequest(req, { action: 'auth 2fa enabled', targetId: req.user!.id, status: 200 });
  res.json(result);
};

export const twoFactorDisable: RequestHandler = async (req, res) => {
  const { password, code } = req.body as { password: string; code: string };
  await twoFactor.disable(req.user!.id, password, code);
  void auditRequest(req, { action: 'auth 2fa disabled', targetId: req.user!.id, status: 204 });
  res.status(204).end();
};

export const logout: RequestHandler = async (req, res) => {
  // Sign the token out for real (not just the cookie), so a copy of it cannot be replayed.
  const token: unknown = req.cookies?.[AUTH_COOKIE];
  const payload = typeof token === 'string' ? verifyToken(token) : null;
  if (payload?.jti && payload.exp) {
    await prisma.revokedToken
      .upsert({ where: { jti: payload.jti }, create: { jti: payload.jti, expiresAt: new Date(payload.exp * 1000) }, update: {} })
      .catch((error: unknown) => console.warn('Could not revoke token:', error instanceof Error ? error.message : error));
    void auditRequest(req, { action: 'auth logout', actorId: payload.sub, status: 204 });
  }
  res.clearCookie(AUTH_COOKIE, cookieOptions);
  res.status(204).end();
};

export const me: RequestHandler = (req, res) => {
  res.json({ user: { ...req.user, twoFactorRequired: twoFactorRequired(req.user!) } });
};

export const changePassword: RequestHandler = async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const user = await changeOwnPassword(req.user!.id, currentPassword, newPassword);
  void auditRequest(req, { action: 'auth password change', targetId: user.id, status: 204 });
  // Every other session is now invalid; give this one a fresh token so the user stays signed in.
  res.cookie(AUTH_COOKIE, signToken({ sub: user.id, role: user.role }), { ...cookieOptions, maxAge: TOKEN_MAX_AGE_SECONDS * 1000 });
  res.status(204).end();
};
