import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { loginEmailLimiter, loginLimiter, passwordLimiter, twoFactorLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema } from '../validators/admin.validators.js';
import { loginSchema, twoFactorCodeSchema, twoFactorDisableSchema, twoFactorLoginSchema } from '../validators/auth.validators.js';

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, loginEmailLimiter, validate(loginSchema), authController.login);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', requireAuth, authController.me);
authRoutes.post('/change-password', requireAuth, passwordLimiter, validate(changePasswordSchema), authController.changePassword);
authRoutes.post('/login/2fa', loginLimiter, twoFactorLimiter, validate(twoFactorLoginSchema), authController.loginTwoFactor);
authRoutes.post('/2fa/setup', requireAuth, passwordLimiter, authController.twoFactorSetup);
authRoutes.post('/2fa/enable', requireAuth, passwordLimiter, validate(twoFactorCodeSchema), authController.twoFactorEnable);
authRoutes.post('/2fa/disable', requireAuth, passwordLimiter, validate(twoFactorDisableSchema), authController.twoFactorDisable);
