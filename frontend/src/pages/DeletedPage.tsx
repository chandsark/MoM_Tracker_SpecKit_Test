import type { DeletedRecord } from '@mom/shared';
import { useState } from 'react';
import { useDeletedRecords, useRestore } from '../api/deleted';
import { ErrorMessage } from '../components/ErrorMessage';
import { formatDateTime } from '../lib/format';
import { LoadingSkeleton } from '../components/Skeleton';

const TYPE_LABELS: Record<DeletedRecord['entityType'], string> = {
  meeting: 'Meeting',
  'action-item': 'Action item',
  issue: 'Issue',
};

/** Soft-deleted records from meetings the user organizes, one entry per deletion (FR-028). */
export function DeletedPage() {
  const records = useDeletedRecords();
  const restore = useRestore();
  const [restored, setRestored] = useState<string | null>(null);

  async function onRestore(r: DeletedRecord) {
    setRestored(null);
    try {
      await restore.mutateAsync(r);
      setRestored(r.label);
    } catch {
      // shown below via restore.error
    }
  }

  return (
    <>
      <h1 className="mb-2">Deleted items</h1>
      <p className="mt-0 mb-6 text-muted">
        Restoring a record also restores everything that was deleted with it. Only meetings you
        organize are listed.
      </p>
      {restored && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-success/40 bg-success-bg px-4 py-3 text-success"
        >
          Restored “{restored}”.
        </p>
      )}
      <ErrorMessage error={restore.error} />
      <ErrorMessage error={records.error} />
      {records.isPending && <LoadingSkeleton />}
      {records.data && records.data.length === 0 && (
        <p className="text-muted">Nothing has been deleted.</p>
      )}
      {records.data && records.data.length > 0 && (
        <ul
          className="card m-0 list-none divide-y divide-border p-0 sm:p-0 [&>li]:px-4 [&>li]:py-3 sm:[&>li]:px-6"
          aria-label="Deleted items"
        >
          {records.data.map((r) => (
            <li
              key={r.deletionBatchId}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="badge badge-neutral">{TYPE_LABELS[r.entityType]}</span>
                  <strong>{r.label}</strong>
                </div>
                <span className="text-muted">
                  Deleted {r.deletedBy ? `by ${r.deletedBy.name} ` : ''}on{' '}
                  <time dateTime={r.deletedAt}>{formatDateTime(r.deletedAt)}</time>
                  {r.dependentCount > 0 &&
                    ` · ${r.dependentCount} related ${r.dependentCount === 1 ? 'record' : 'records'}`}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={restore.isPending}
                onClick={() => void onRestore(r)}
              >
                Restore<span className="sr-only"> {r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
