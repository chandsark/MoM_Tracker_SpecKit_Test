import {
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  IssueUpdate,
  type Issue,
  type IssueSeverity,
  type IssueStatus,
} from '@mom/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError } from '../api/client';
import { useUpdateIssue } from '../api/issues';
import { ConflictBanner } from './ConflictBanner';

interface Fields {
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
}

const fieldsOf = (i: Issue): Fields => ({
  title: i.title,
  description: i.description,
  severity: i.severity,
  status: i.status,
});

/** Edit form for the action item's assignee and the meeting organizer (FR-015). */
export function IssueEditor({ issue }: { issue: Issue }) {
  const update = useUpdateIssue(issue.id);
  const [base, setBase] = useState(issue);
  const [fields, setFields] = useState(() => fieldsOf(issue));
  const [conflict, setConflict] = useState<Issue | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBase(issue);
    setFields(fieldsOf(issue));
  }, [issue]);

  if (!issue.permissions.canEdit) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const before = fieldsOf(base);
    const body: Record<string, string | number> = { version: base.version };
    for (const key of Object.keys(fields) as (keyof Fields)[]) {
      if (fields[key] !== before[key]) body[key] = fields[key];
    }
    if (Object.keys(body).length === 1) {
      setMessage('No changes to save.');
      return;
    }
    const parsed = IssueUpdate.safeParse(body);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Some fields are invalid.');
      return;
    }
    try {
      await update.mutateAsync(parsed.data);
      setMessage('Saved.');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VERSION_CONFLICT') {
        setConflict(err.details?.current as Issue);
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not save the issue.');
      }
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card" aria-labelledby="issue-editor-heading">
      <h2 id="issue-editor-heading">Update issue</h2>
      {conflict && (
        <ConflictBanner
          onReload={() => {
            setBase(conflict);
            setFields(fieldsOf(conflict));
            setConflict(null);
          }}
        >
          <p>
            Latest values — {conflict.title} · Severity: {ISSUE_SEVERITY_LABELS[conflict.severity]}{' '}
            · Status: {ISSUE_STATUS_LABELS[conflict.status]}
          </p>
        </ConflictBanner>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="field">
        <label htmlFor="issue-edit-title">Title</label>
        <input
          id="issue-edit-title"
          maxLength={200}
          value={fields.title}
          onChange={(e) => setFields({ ...fields, title: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="issue-edit-description">Description</label>
        <textarea
          id="issue-edit-description"
          maxLength={2000}
          value={fields.description}
          onChange={(e) => setFields({ ...fields, description: e.target.value })}
        />
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="issue-edit-severity">Severity</label>
          <select
            id="issue-edit-severity"
            value={fields.severity}
            onChange={(e) => setFields({ ...fields, severity: e.target.value as IssueSeverity })}
          >
            {ISSUE_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {ISSUE_SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="issue-edit-status">Status</label>
          <select
            id="issue-edit-status"
            value={fields.status}
            onChange={(e) => setFields({ ...fields, status: e.target.value as IssueStatus })}
          >
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ISSUE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button type="submit" disabled={update.isPending}>
        Save issue
      </button>{' '}
      <span role="status" className="muted">
        {message}
      </span>
    </form>
  );
}
