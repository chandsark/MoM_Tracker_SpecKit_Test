import { LoginRequest, RegisterRequest } from '@mom/shared';
import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { config } from '../config';
import { unauthenticated } from '../lib/errors';
import { asyncHandler, validateBody } from '../middleware/validate';
import * as auth from './service';
import { SESSION_TTL_MS, createSession, deleteSession } from './sessionStore';

export const SESSION_COOKIE = 'sid';

function setSessionCookie(res: Response, sessionId: string): void {
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.NODE_ENV === 'production',
    signed: true,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

export function authRouter(): Router {
  const router = Router();

  // A new limiter per router instance, so each app (and each test app) has its own counters.
  const loginLimiter = rateLimit({
    windowMs: 60_000,
    limit: config.LOGIN_RATE_LIMIT,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) =>
      `${req.ip ?? 'unknown'}|${String((req.body as { email?: unknown })?.email ?? '').toLowerCase()}`,
    handler: (_req, res) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many sign-in attempts. Try again in a minute.',
        },
      });
    },
  });

  router.post(
    '/register',
    validateBody(RegisterRequest),
    asyncHandler(async (req, res) => {
      const user = await auth.register(req.body as RegisterRequest);
      setSessionCookie(res, await createSession(user.id));
      res.status(201).json(user);
    }),
  );

  router.post(
    '/login',
    loginLimiter,
    validateBody(LoginRequest),
    asyncHandler(async (req, res) => {
      const user = await auth.login(req.body as LoginRequest);
      setSessionCookie(res, await createSession(user.id));
      res.json(user);
    }),
  );

  router.post(
    '/logout',
    asyncHandler(async (req, res) => {
      const sid = (req.signedCookies as Record<string, unknown>)[SESSION_COOKIE];
      if (typeof sid === 'string') await deleteSession(sid);
      res.clearCookie(SESSION_COOKIE, { path: '/' });
      res.status(204).end();
    }),
  );

  return router;
}

/** GET /api/auth/me — mounted behind requireAuth. */
export const meRouter = Router().get('/me', (req, res) => {
  if (!req.user) throw unauthenticated();
  const { id, name, email } = req.user;
  res.json({ id, name, email });
});
