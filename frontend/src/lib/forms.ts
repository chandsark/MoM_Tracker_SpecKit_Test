import type { FieldErrors, FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '../api/client';

/** First error message for a field, for FormField's `error` prop. */
export function fieldError<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: string,
): string | undefined {
  const parts = name.split('.');
  let node: unknown = errors;
  for (const p of parts) node = (node as Record<string, unknown> | undefined)?.[p];
  const n = node as { message?: unknown; root?: { message?: unknown } } | undefined;
  const message = n?.message ?? n?.root?.message;
  return typeof message === 'string' ? message : undefined;
}

/**
 * Copies server VALIDATION_ERROR field messages onto the form. Returns the message to show at
 * form level when the error is not about specific fields.
 */
export function applyServerErrors<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fieldMap: Record<string, Path<T>> = {},
): string | null {
  if (!(err instanceof ApiError)) return 'Something went wrong. Please try again.';
  const fields = err.fieldErrors;
  let applied = false;
  for (const [key, messages] of Object.entries(fields)) {
    const target = fieldMap[key] ?? (key as Path<T>);
    if (messages[0]) {
      setError(target, { type: 'server', message: messages[0] });
      applied = true;
    }
  }
  return applied ? null : err.message;
}
