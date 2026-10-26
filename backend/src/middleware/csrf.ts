import type { RequestHandler } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cross-site forms cannot set custom headers, so requiring X-Requested-With on state-changing
 * requests (together with SameSite=Lax cookies) blocks CSRF.
 */
export const csrfGuard: RequestHandler = (req, res, next) => {
  if (SAFE_METHODS.has(req.method) || req.get('X-Requested-With') === 'fetch') {
    next();
    return;
  }
  res.status(403).json({
    error: { code: 'FORBIDDEN', message: 'Missing X-Requested-With header.' },
  });
};
