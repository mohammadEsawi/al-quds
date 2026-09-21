import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../lib/errors.js';
import { containsNul } from '../lib/nullBytes.js';

type Source = 'body' | 'query' | 'params';

/**
 * Validates one part of the request against a zod schema and replaces it with
 * the parsed (trimmed / coerced / stripped) result.
 */
export function validate(schema: ZodType, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    if (containsNul(req[source])) throw AppError.badRequest('Invalid characters in request', 'INVALID_CHARACTERS');
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const fields = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw AppError.badRequest('Validation failed', 'VALIDATION_ERROR', fields);
    }
    // Express 5 exposes `req.query` as a getter, so define the value explicitly.
    Object.defineProperty(req, source, { value: result.data, writable: true, configurable: true });
    next();
  };
}
