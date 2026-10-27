import type { ReactNode } from 'react';
import { AlertIcon } from './icons';

/** Shown when a save returns VERSION_CONFLICT: the latest values and a way to load them. */
export function ConflictBanner({
  children,
  onReload,
}: {
  children?: ReactNode;
  onReload: () => void;
}) {
  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning-bg px-4 py-3 text-warning"
      role="alert"
    >
      <AlertIcon className="mt-0.5 size-5" />
      <div className="min-w-0 flex-1 space-y-3">
        <p className="m-0">
          <strong>This item was changed by someone else.</strong> Review the latest values below,
          then re-apply your changes.
        </p>
        {children}
        <button type="button" className="btn btn-secondary" onClick={onReload}>
          Load latest values
        </button>
      </div>
    </div>
  );
}
