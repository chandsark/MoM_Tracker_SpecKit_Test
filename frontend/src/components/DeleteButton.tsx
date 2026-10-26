import type { EntityPathSegment } from '@mom/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useDeleteRecord } from '../api/deleted';
import { useDeletionImpact } from '../api/meetings';
import { ConfirmDialog } from './ConfirmDialog';
import { ErrorMessage } from './ErrorMessage';

const NOUN: Record<EntityPathSegment, string> = {
  meeting: 'meeting',
  'action-item': 'action item',
  issue: 'issue',
};

type IssueRef = { id: string; title: string };

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

function MeetingImpact({ id }: { id: string }) {
  const impact = useDeletionImpact(id, true);
  if (impact.isPending) return <p role="status">Checking what will be deleted…</p>;
  if (impact.error) return <ErrorMessage error={impact.error} />;
  const { actionItemCount, issueCount, actionItems } = impact.data;
  if (actionItemCount === 0) return <p>Nothing else is deleted with it.</p>;
  return (
    <>
      <p>
        This also deletes {count(actionItemCount, 'action item')} and {count(issueCount, 'issue')}:
      </p>
      <ul>
        {actionItems.map((i) => (
          <li key={i.id}>
            {i.description}
            {i.issues.length > 0 && (
              <ul aria-label={`Issues on ${i.description}`}>
                {i.issues.map((issue) => (
                  <li key={issue.id}>{issue.title}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

function ActionItemImpact({ issues }: { issues: IssueRef[] }) {
  if (issues.length === 0) return <p>Nothing else is deleted with it.</p>;
  return (
    <>
      <p>This also deletes {count(issues.length, 'issue')}:</p>
      <ul aria-label="Issues deleted with it">
        {issues.map((issue) => (
          <li key={issue.id}>{issue.title}</li>
        ))}
      </ul>
    </>
  );
}

interface Props {
  entityType: EntityPathSegment;
  id: string;
  /** The version the user is looking at; a newer one on the server gives a conflict. */
  version: number;
  /** Where to go once deleted: the parent record or the list. */
  redirectTo: string;
  /** For an action item: the issues deleted with it. */
  issues?: IssueRef[];
}

/** Organizer-only delete with a confirmation listing everything that goes with it (FR-025). */
export function DeleteButton({ entityType, id, version, redirectTo, issues = [] }: Props) {
  const [open, setOpen] = useState(false);
  const del = useDeleteRecord(entityType, id);
  const navigate = useNavigate();
  const noun = NOUN[entityType];

  async function confirm() {
    try {
      await del.mutateAsync(version);
    } catch {
      return; // shown in the dialog
    }
    navigate(redirectTo);
  }

  function cancel() {
    setOpen(false);
    del.reset();
  }

  return (
    <>
      <button type="button" className="danger" onClick={() => setOpen(true)}>
        Delete {noun}
      </button>
      <ConfirmDialog
        open={open}
        title={`Delete this ${noun}?`}
        confirmLabel="Delete"
        destructive
        busy={del.isPending}
        onConfirm={() => void confirm()}
        onCancel={cancel}
      >
        {entityType === 'meeting' && <MeetingImpact id={id} />}
        {entityType === 'action-item' && <ActionItemImpact issues={issues} />}
        {entityType === 'issue' && <p>Nothing else is deleted with it.</p>}
        <p className="muted">You can restore it later from Deleted items.</p>
        <ErrorMessage error={del.error} />
      </ConfirmDialog>
    </>
  );
}
