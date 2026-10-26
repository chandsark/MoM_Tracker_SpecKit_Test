import { z } from 'zod';

function isRealCalendarDate(value: string): boolean {
  const [y, m, d] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** A calendar date in YYYY-MM-DD form that exists (no 2026-02-30). */
export const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Use the format YYYY-MM-DD' })
  .refine(isRealCalendarDate, { message: 'Not a valid date' });

/** Text that is trimmed, must not be empty after trimming, and has a maximum length. */
export function requiredText(max: number) {
  return z
    .string({ message: 'Required' })
    .trim()
    .min(1, { message: 'Required' })
    .max(max, { message: `Must be at most ${max} characters` });
}

export const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
export type Pagination = z.infer<typeof pagination>;

/** Optimistic-lock version sent with every update. */
export const version = z.number().int().min(1);

/** Query string of a DELETE request: the version the user confirmed deleting. */
export const DeleteQuery = z.object({ version: z.coerce.number().int().min(1) });

/** Object schema that rejects unknown keys. */
export function strictObject<T extends z.ZodRawShape>(shape: T) {
  return z.strictObject(shape);
}

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'VERSION_CONFLICT',
  'OPEN_ISSUES_CONFIRMATION_REQUIRED',
  'PARENT_DELETED',
  'RATE_LIMITED',
  'INTERNAL',
] as const;
export const ErrorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCode>;

export interface ErrorBody {
  error: { code: ErrorCode; message: string; details?: Record<string, unknown> };
}
