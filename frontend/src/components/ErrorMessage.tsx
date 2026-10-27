import { ApiError } from '../api/client';
import { AlertIcon } from './icons';

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
    <p
      className="my-4 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger"
      role="alert"
    >
      <AlertIcon className="mt-0.5 size-4" />
      <span>{message}</span>
    </p>
  );
}
