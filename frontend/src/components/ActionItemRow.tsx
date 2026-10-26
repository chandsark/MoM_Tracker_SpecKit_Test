import type { ActionItem } from '@mom/shared';
import { Link } from 'react-router';
import { formatDate } from '../lib/format';
import { StatusBadge } from './StatusBadge';

/** Compact action item summary used by lists on the home and meeting pages. */
export function ActionItemSummary({
  item,
  showMeeting = false,
}: {
  item: ActionItem;
  showMeeting?: boolean;
}) {
  return (
    <div className="stack" style={{ gap: '0.25rem' }}>
      <div className="row" style={{ alignItems: 'center' }}>
        <Link to={`/action-items/${item.id}`}>{item.description}</Link>
        <StatusBadge kind="action" value={item.status} />
        {item.isOverdue && <StatusBadge kind="overdue" />}
        {item.openIssueCount > 0 && (
          <span className="badge badge-high">
            {item.openIssueCount} open {item.openIssueCount === 1 ? 'issue' : 'issues'}
          </span>
        )}
      </div>
      <span className="muted">
        {item.assignee.name} · due {formatDate(item.dueDate)}
        {showMeeting && <> · from {item.meeting.description}</>}
        {item.needsReassignment && <> · needs reassignment</>}
      </span>
    </div>
  );
}
