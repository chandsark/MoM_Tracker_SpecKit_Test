import {
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
  DUE_BEFORE_START_MESSAGE,
  type ActionItemDetail,
  type ActionItemStatus,
  type ActionItemUpdate,
} from '@mom/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { useUpdateActionItem } from '../api/actionItems';
import { ApiError } from '../api/client';
import { useAllUsers } from '../api/users';
import { formatDate } from '../lib/format';
import { ConfirmDialog } from './ConfirmDialog';
import { ConflictBanner } from './ConflictBanner';

interface Fields {
  status: ActionItemStatus;
  startDate: string;
  dueDate: string;
  assigneeId: string;
}

const fieldsOf = (item: ActionItemDetail): Fields => ({
  status: item.status,
  startDate: item.startDate,
  dueDate: item.dueDate,
  assigneeId: item.assignee.id,
});

/** Status / date / assignee editor for the assignee and organizer (FR-008, FR-009, FR-026). */
export function ActionItemEditor({ item }: { item: ActionItemDetail }) {
  const update = useUpdateActionItem(item.id);
  const users = useAllUsers(item.permissions.canReassign);
  const [base, setBase] = useState(item);
  const [fields, setFields] = useState<Fields>(() => fieldsOf(item));
  const [conflict, setConflict] = useState<ActionItemDetail | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDone, setConfirmDone] = useState<number | null>(null);

  // Follow the server copy when it changes (after our own save or a refetch).
  useEffect(() => {
    setBase(item);
    setFields(fieldsOf(item));
  }, [item]);

  if (!item.permissions.canEdit) return null;

  function changes(): Omit<ActionItemUpdate, 'version'> {
    const out: Omit<ActionItemUpdate, 'version'> = {};
    const before = fieldsOf(base);
    if (fields.status !== before.status) out.status = fields.status;
    if (fields.startDate !== before.startDate) out.startDate = fields.startDate;
    if (fields.dueDate !== before.dueDate) out.dueDate = fields.dueDate;
    if (fields.assigneeId !== before.assigneeId) out.assigneeId = fields.assigneeId;
    return out;
  }

  async function save(confirmOpenIssues = false) {
    setMessage(null);
    setError(null);
    const body = changes();
    if (Object.keys(body).length === 0) {
      setMessage('No changes to save.');
      return;
    }
    if (fields.dueDate < fields.startDate) {
      setError(DUE_BEFORE_START_MESSAGE);
      return;
    }
    try {
      await update.mutateAsync({
        version: base.version,
        ...body,
        ...(confirmOpenIssues ? { confirmOpenIssues: true } : {}),
      });
      setConfirmDone(null);
      setMessage('Saved.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        setConflict(err.details?.current as ActionItemDetail);
      } else if (err instanceof ApiError && err.code === 'OPEN_ISSUES_CONFIRMATION_REQUIRED') {
        setConfirmDone(Number(err.details?.openIssueCount ?? 0));
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not save the changes.');
      }
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void save();
  }

  return (
    <form onSubmit={onSubmit} className="card" aria-labelledby="editor-heading" noValidate>
      <h2 id="editor-heading" className="mt-0 mb-4">
        Update progress
      </h2>
      {conflict && (
        <ConflictBanner
          onReload={() => {
            setBase(conflict);
            setFields(fieldsOf(conflict));
            setConflict(null);
          }}
        >
          <p>
            Latest values — Status: {ACTION_ITEM_STATUS_LABELS[conflict.status]} · Start:{' '}
            {formatDate(conflict.startDate)} · Due: {formatDate(conflict.dueDate)} · Assignee:{' '}
            {conflict.assignee.name}
          </p>
        </ConflictBanner>
      )}
      {error && (
        <p
          className="mb-4 rounded-lg border border-danger/30 bg-danger-bg px-4 py-3 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="grid gap-x-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="mb-4 flex min-w-0 flex-col gap-1.5">
          <label htmlFor="edit-status" className="field-label">
            Status
          </label>
          <select
            id="edit-status"
            value={fields.status}
            onChange={(e) => setFields({ ...fields, status: e.target.value as ActionItemStatus })}
          >
            {ACTION_ITEM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ACTION_ITEM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4 flex min-w-0 flex-col gap-1.5">
          <label htmlFor="edit-start" className="field-label">
            Start date
          </label>
          <input
            id="edit-start"
            type="date"
            value={fields.startDate}
            onChange={(e) => setFields({ ...fields, startDate: e.target.value })}
          />
        </div>
        <div className="mb-4 flex min-w-0 flex-col gap-1.5">
          <label htmlFor="edit-due" className="field-label">
            Due date
          </label>
          <input
            id="edit-due"
            type="date"
            value={fields.dueDate}
            onChange={(e) => setFields({ ...fields, dueDate: e.target.value })}
          />
        </div>
        {item.permissions.canReassign && (
          <div className="mb-4 flex min-w-0 flex-col gap-1.5">
            <label htmlFor="edit-assignee" className="field-label">
              Assignee
            </label>
            <select
              id="edit-assignee"
              value={fields.assigneeId}
              onChange={(e) => setFields({ ...fields, assigneeId: e.target.value })}
            >
              {!users.data?.items.some((u) => u.id === base.assignee.id) && (
                <option value={base.assignee.id}>{base.assignee.name}</option>
              )}
              {users.data?.items.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <button type="submit" className="btn btn-primary" disabled={update.isPending}>
        Save changes
      </button>
      <span role="status" className="ml-3 text-sm text-muted">
        {message}
      </span>
      <ConfirmDialog
        open={confirmDone !== null}
        title="Mark as Done with open issues?"
        confirmLabel="Mark as Done"
        busy={update.isPending}
        onCancel={() => setConfirmDone(null)}
        onConfirm={() => void save(true)}
      >
        <p>
          This action item still has {confirmDone} open {confirmDone === 1 ? 'issue' : 'issues'}.
          Mark it as Done anyway?
        </p>
      </ConfirmDialog>
    </form>
  );
}
