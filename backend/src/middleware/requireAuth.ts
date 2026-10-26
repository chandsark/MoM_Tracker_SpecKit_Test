import { SESSION_COOKIE } from '../auth/routes';
import { getSession } from '../auth/sessionStore';
import { unauthenticated } from '../lib/errors';
import { asyncHandler } from './validate';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const sid = (req.signedCookies as Record<string, unknown>)[SESSION_COOKIE];
  if (typeof sid !== 'string') throw unauthenticated();
  const session = await getSession(sid);
  if (!session || session.user.deactivatedAt !== null) throw unauthenticated();
  const { id, name, email, deactivatedAt } = session.user;
  req.user = { id, name, email, deactivatedAt };
  req.sessionId = session.id;
  next();
});
