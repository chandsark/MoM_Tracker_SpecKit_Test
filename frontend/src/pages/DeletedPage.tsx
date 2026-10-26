import type { DeletedRecord } from '@mom/shared';
import { useState } from 'react';
import { useDeletedRecords, useRestore } from '../api/deleted';
import { ErrorMessage } from '../components/ErrorMessage';
import { formatDateTime } from '../lib/format';

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
      <h1>Deleted items</h1>
      <p className="muted">
        Restoring a record also restores everything that was deleted with it. Only meetings you
        organize are listed.
      </p>
      {restored && (
        <p role="status" className="banner">
          Restored “{restored}”.
        </p>
      )}
      <ErrorMessage error={restore.error} />
      <ErrorMessage error={records.error} />
      {records.isPending && <p role="status">Loading…</p>}
      {records.data && records.data.length === 0 && (
        <p className="muted">Nothing has been deleted.</p>
      )}
      {records.data && records.data.length > 0 && (
        <ul className="plain-list" aria-label="Deleted items">
          {records.data.map((r) => (
            <li
              key={r.deletionBatchId}
              className="row"
              style={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div className="stack" style={{ gap: '0.25rem' }}>
                <div className="row" style={{ alignItems: 'center' }}>
                  <span className="badge">{TYPE_LABELS[r.entityType]}</span>
                  <strong>{r.label}</strong>
                </div>
                <span className="muted">
                  Deleted {r.deletedBy ? `by ${r.deletedBy.name} ` : ''}on{' '}
                  <time dateTime={r.deletedAt}>{formatDateTime(r.deletedAt)}</time>
                  {r.dependentCount > 0 &&
                    ` · ${r.dependentCount} related ${r.dependentCount === 1 ? 'record' : 'records'}`}
                </span>
              </div>
              <button
                type="button"
                className="secondary"
                disabled={restore.isPending}
                onClick={() => void onRestore(r)}
              >
                Restore<span className="visually-hidden"> {r.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
