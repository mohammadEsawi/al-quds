import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { MEDIA_DIR } from './lib/files.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { adminLimiter, apiLimiter } from './middleware/rateLimit.js';
import { allowedOrigins, noStore, originGuard } from './middleware/security.js';
import { apiRouter } from './routes/index.js';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Media library files are public. CVs live in a separate private folder that is never served here.
  app.use(
    '/uploads/media',
    express.static(MEDIA_DIR, {
      index: false,
      dotfiles: 'deny',
      maxAge: '7d',
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        // Uploaded files can only ever be shown as images/video, never run as a page.
        res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      },
    }),
  );

  app.use(['/api/admin', '/api/auth'], noStore, originGuard);
  app.use('/api/admin', adminLimiter);
  app.use('/api', apiLimiter, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
