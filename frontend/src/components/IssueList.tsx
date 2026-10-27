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
  if (issues.length === 0) return <p className="text-muted">No issues raised.</p>;
  return (
    <ul className="m-0 list-none divide-y divide-border p-0 [&>li]:py-3" aria-label="Issues">
      {issues.map((issue) => (
        <li key={issue.id}>
          <div className="flex flex-wrap items-center gap-2">
            <Link to={`/issues/${issue.id}`} className="font-medium break-words">
              {issue.title}
            </Link>
            <StatusBadge kind="severity" value={issue.severity} />
            <StatusBadge kind="issue" value={issue.status} />
          </div>
          <span className="mt-1 block text-sm text-muted">
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
