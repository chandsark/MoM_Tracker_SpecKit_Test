import type { ErrorCode } from '@mom/shared';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function forbidden(message = 'You do not have permission to do that.'): AppError {
  return new AppError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'Not found.'): AppError {
  return new AppError(404, 'NOT_FOUND', message);
}

export function unauthenticated(message = 'Please sign in.'): AppError {
  return new AppError(401, 'UNAUTHENTICATED', message);
}

export function versionConflict(current: unknown): AppError {
  return new AppError(
    409,
    'VERSION_CONFLICT',
    'This record was changed by someone else. Review the latest values and try again.',
    { current },
  );
}

/** A 400 whose details match the shape produced for schema validation failures. */
export function fieldError(field: string, message: string): AppError {
  return new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid.', {
    fields: { [field]: [message] },
  });
}
