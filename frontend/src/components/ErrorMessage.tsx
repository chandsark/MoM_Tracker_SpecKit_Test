import { ApiError } from '../api/client';

/** Friendly message for a failed request; never shows raw stack traces. */
export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null;
  const message =
    error instanceof ApiError
      ? error.status === 404
        ? 'This record does not exist or has been deleted.'
        : error.message
      : 'Something went wrong. Please try again.';
  return (
    <p className="form-error" role="alert">
      {message}
    </p>
  );
}
