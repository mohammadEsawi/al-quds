import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema } from '../validators/admin.validators.js';
import { loginSchema } from '../validators/auth.validators.js';

export const authRoutes = Router();

authRoutes.post('/login', loginLimiter, validate(loginSchema), authController.login);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', requireAuth, authController.me);
authRoutes.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);
