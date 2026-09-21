import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const twoFactorLoginSchema = z.object({
  mfaToken: z.string().min(10).max(2000),
  code: z.string().trim().min(6).max(16),
});

export const twoFactorCodeSchema = z.object({ code: z.string().trim().min(6).max(16) });

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1).max(200),
  code: z.string().trim().min(6).max(16),
});
