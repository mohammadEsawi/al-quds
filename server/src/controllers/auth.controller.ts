import type { CookieOptions, RequestHandler } from 'express';
import { isProduction } from '../config/env.js';
import { signToken, TOKEN_MAX_AGE_SECONDS } from '../lib/jwt.js';
import { AUTH_COOKIE } from '../middleware/auth.js';
import * as authService from '../services/auth.service.js';
import { changeOwnPassword } from '../services/users.service.js';
import type { LoginInput } from '../validators/auth.validators.js';

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: isProduction,
  path: '/',
};

export const login: RequestHandler = async (req, res) => {
  const { token, user } = await authService.login(req.body as LoginInput);
  res.cookie(AUTH_COOKIE, token, { ...cookieOptions, maxAge: TOKEN_MAX_AGE_SECONDS * 1000 });
  res.json({ user });
};

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie(AUTH_COOKIE, cookieOptions);
  res.status(204).end();
};

export const me: RequestHandler = (req, res) => {
  res.json({ user: req.user });
};

export const changePassword: RequestHandler = async (req, res) => {
  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const user = await changeOwnPassword(req.user!.id, currentPassword, newPassword);
  // Every other session is now invalid; give this one a fresh token so the user stays signed in.
  res.cookie(AUTH_COOKIE, signToken({ sub: user.id, role: user.role }), { ...cookieOptions, maxAge: TOKEN_MAX_AGE_SECONDS * 1000 });
  res.status(204).end();
};
