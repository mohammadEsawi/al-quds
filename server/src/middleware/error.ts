import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { isProduction } from '../config/env.js';
import { AppError } from '../lib/errors.js';

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound('Route not found', 'ROUTE_NOT_FOUND'));
};

/** Translates the Prisma error codes a client can actually cause. */
function fromPrisma(err: { code?: string; meta?: { target?: unknown } }): AppError | null {
  switch (err.code) {
    case 'P2002':
      return new AppError(409, 'CONFLICT', 'A record with the same unique value already exists');
    case 'P2025':
      return AppError.notFound('Record not found', 'NOT_FOUND');
    case 'P2003':
      return AppError.badRequest('A referenced record does not exist', 'INVALID_REFERENCE');
    default:
      return null;
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let appError: AppError | null = err instanceof AppError ? err : null;

  if (!appError && err instanceof multer.MulterError) {
    appError =
      err.code === 'LIMIT_FILE_SIZE'
        ? new AppError(413, 'FILE_TOO_LARGE', 'The file is larger than the allowed size')
        : AppError.badRequest('Invalid upload', 'UPLOAD_ERROR');
  }
  if (!appError && err?.name === 'PrismaClientKnownRequestError') appError = fromPrisma(err);

  if (appError) {
    res.status(appError.status).json({
      error: { code: appError.code, message: appError.message, details: appError.details },
    });
    return;
  }

  // Malformed JSON bodies and oversized payloads are client errors.
  const status = typeof err?.status === 'number' ? err.status : 500;
  if (status >= 400 && status < 500 && err?.type) {
    res.status(status).json({ error: { code: 'BAD_REQUEST', message: 'Invalid request' } });
    return;
  }

  // Never leak internals to the client; log them server-side only.
  console.error(`[${req.method}] ${req.originalUrl}`, isProduction ? err?.message : err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong, please try again later' },
  });
};
