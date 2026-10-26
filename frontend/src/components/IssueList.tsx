import type { Issue } from '@mom/shared';
import { Link } from 'react-router';
import { StatusBadge } from './StatusBadge';

export function IssueList({
  issues,
  showParent = false,
}: {
  issues: Issue[];
  showParent?: boolean;
}) {
  if (issues.length === 0) return <p className="muted">No issues raised.</p>;
  return (
    <ul className="plain-list" aria-label="Issues">
      {issues.map((issue) => (
        <li key={issue.id}>
          <div className="row" style={{ alignItems: 'center' }}>
            <Link to={`/issues/${issue.id}`}>{issue.title}</Link>
            <StatusBadge kind="severity" value={issue.severity} />
            <StatusBadge kind="issue" value={issue.status} />
          </div>
          <span className="muted">
            raised by {issue.raisedBy.name}
            {showParent && (
              <>
                {' '}
                on{' '}
                <Link to={`/action-items/${issue.actionItem.id}`}>
                  {issue.actionItem.description}
                </Link>
              </>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
