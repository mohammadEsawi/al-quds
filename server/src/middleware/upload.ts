import type { RequestHandler } from 'express';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';

const memory = (limitMb: number) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: limitMb * 1024 * 1024, files: 1, fields: 30, fieldSize: 20_000, parts: 40, headerPairs: 60 },
  });

/** Malformed multipart bodies come from the client, so they are 400s, not server errors. */
function safely(handler: RequestHandler): RequestHandler {
  return (req, res, next) =>
    handler(req, res, (error?: unknown) => {
      if (!error) return next();
      if (error instanceof multer.MulterError || error instanceof AppError) return next(error);
      next(AppError.badRequest('Invalid upload', 'UPLOAD_ERROR'));
    });
}

/** Media library upload (field `file`). Per-kind limits (image vs video) are enforced in the service. */
export const mediaUpload = safely(memory(Math.max(env.MAX_UPLOAD_MB, env.MAX_VIDEO_MB)).single('file'));

/** Job application CV (field `cv`). */
export const cvUpload = safely(memory(env.MAX_CV_MB).single('cv'));
