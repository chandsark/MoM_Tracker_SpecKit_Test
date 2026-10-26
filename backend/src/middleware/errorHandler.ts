import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors';

function zodFields(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : '_form';
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Some fields are invalid.',
        details: { fields: zodFields(err) },
      },
    });
    return;
  }
  // Errors raised by express.json() for malformed or oversized bodies.
  const type = (err as { type?: string }).type;
  if (type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Malformed JSON body.' } });
    return;
  }
  if (type === 'entity.too.large') {
    res
      .status(413)
      .json({ error: { code: 'VALIDATION_ERROR', message: 'Request body is too large.' } });
    return;
  }
  (req as { log?: { error: (o: object, m: string) => void } }).log?.error(
    { err },
    'unhandled error',
  );
  res
    .status(500)
    .json({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
};
