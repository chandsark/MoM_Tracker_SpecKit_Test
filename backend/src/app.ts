import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import express, { type Router } from 'express';
import helmet from 'helmet';
import type { DestinationStream } from 'pino';
import { actionItemsRouter } from './actionItems/routes';
import { authRouter, meRouter } from './auth/routes';
import { commentsRouter } from './comments/routes';
import { deletedRouter } from './deleted/routes';
import { historyRouter } from './history/routes';
import { issuesRouter } from './issues/routes';
import { meetingsRouter } from './meetings/routes';
import { config } from './config';
import { csrfGuard } from './middleware/csrf';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requireAuth } from './middleware/requireAuth';
import { createLogger, requestLogger } from './middleware/requestLogger';
import { usersRouter } from './users/routes';

/** Feature routers mounted at /api behind requireAuth. Each feature module adds itself here. */
const featureRouters: Router[] = [
  usersRouter,
  meetingsRouter,
  actionItemsRouter,
  commentsRouter,
  historyRouter,
  issuesRouter,
  deletedRouter,
];

export function createApp(opts: { logStream?: DestinationStream; logLevel?: string } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } },
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser(config.SESSION_SECRET));
  app.use(requestLogger(createLogger(opts.logStream, opts.logLevel)));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', csrfGuard);
  app.use('/api/auth', authRouter());
  app.use('/api', requireAuth);
  app.use('/api/auth', meRouter);
  for (const router of featureRouters) app.use('/api', router);
  app.use('/api', notFoundHandler);

  // In production the built frontend is served from the same origin.
  const webDist = fileURLToPath(new URL('../../frontend/dist', import.meta.url));
  if (config.NODE_ENV === 'production' && existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('*', (_req, res) => {
      res.sendFile(`${webDist}/index.html`);
    });
  }

  app.use(errorHandler);
  return app;
}
