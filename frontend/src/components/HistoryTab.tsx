import {
  ACTION_ITEM_STATUS_LABELS,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUS_LABELS,
  type EntityPathSegment,
  type HistoryEntry,
} from '@mom/shared';
import { useHistory } from '../api/history';
import { formatDate, formatDateTime } from '../lib/format';
import { ErrorMessage } from './ErrorMessage';
import { LoadingSkeleton } from './Skeleton';

const FIELD_LABELS: Record<string, string> = {
  status: 'status',
  startDate: 'start date',
  dueDate: 'due date',
  meetingDate: 'meeting date',
  description: 'description',
  assignee: 'assignee',
  participants: 'participants',
  title: 'title',
  severity: 'severity',
};

const VALUE_LABELS: Record<string, string> = {
  ...ACTION_ITEM_STATUS_LABELS,
  ...ISSUE_STATUS_LABELS,
  ...ISSUE_SEVERITY_LABELS,
};

const DATE_FIELDS = new Set(['startDate', 'dueDate', 'meetingDate']);

function displayValue(field: string, value: string | null): string {
  if (value === null || value === '') return '(empty)';
  if (DATE_FIELDS.has(field)) return formatDate(value);
  if (field === 'assignee') return value.replace(/ \([^)]*\)$/, '');
  return VALUE_LABELS[value] ?? value;
}

export function describeEntry(e: HistoryEntry): string {
  const who = e.actor.name;
  switch (e.action) {
    case 'CREATE':
      return `${who} created this record`;
    case 'DELETE':
      return `${who} deleted this record`;
    case 'RESTORE':
      return `${who} restored this record`;
    default: {
      const field = e.field ?? 'a field';
      const label = FIELD_LABELS[field] ?? field;
      return `${who} changed ${label} from ${displayValue(field, e.oldValue)} to ${displayValue(field, e.newValue)}`;
    }
  }
}

export function HistoryTab({ entityType, id }: { entityType: EntityPathSegment; id: string }) {
  const history = useHistory(entityType, id);
  if (history.isPending) return <LoadingSkeleton label="Loading history…" />;
  if (history.error) return <ErrorMessage error={history.error} />;
  if (history.data.length === 0) return <p className="text-muted">No changes recorded yet.</p>;
  return (
    <ul
      className="m-0 list-none space-y-2 border-l-2 border-border p-0 pl-4"
      aria-label="Change history"
    >
      {history.data.map((e) => (
        <li key={e.id} className="text-sm">
          {describeEntry(e)}{' '}
          <time className="text-muted" dateTime={e.createdAt}>
            {formatDateTime(e.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
