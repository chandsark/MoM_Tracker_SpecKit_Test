import type { ReactNode } from 'react';

/** Shown when a save returns VERSION_CONFLICT: the latest values and a way to load them. */
export function ConflictBanner({
  children,
  onReload,
}: {
  children?: ReactNode;
  onReload: () => void;
}) {
  return (
    <div className="banner" role="alert">
      <p>
        <strong>This item was changed by someone else.</strong> Review the latest values below, then
        re-apply your changes.
      </p>
      {children}
      <button type="button" className="secondary" onClick={onReload}>
        Load latest values
      </button>
    </div>
  );
}
