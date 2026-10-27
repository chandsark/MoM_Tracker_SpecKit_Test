import { Link } from 'react-router';
import { toQueryString } from '../api/client';
import { useIssues } from '../api/issues';
import { useAllUsers } from '../api/users';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { FilterBar, ResultsSummary, useUrlFilters } from '../components/FilterBar';
import { StatusBadge } from '../components/StatusBadge';
import { issueFilterFields, userOptions } from '../lib/filters';
import { formatDateTime } from '../lib/format';
import { LoadingSkeleton } from '../components/Skeleton';

export function IssuesListPage() {
  const users = useAllUsers();
  const assignees = userOptions(users.data?.items, true);
  const f = useUrlFilters(issueFilterFields(assignees));
  const issues = useIssues(f.listQuery);
  // Name the action item chip after the item once its issues have loaded.
  const fields = issueFilterFields(assignees, issues.data?.items[0]?.actionItem.description);
  const exportHref = `/api/issues/export.csv${toQueryString(f.filters)}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>Issues</h1>
        <a className="btn btn-secondary" href={exportHref} download>
          Export CSV
        </a>
      </div>
      <FilterBar fields={fields} label="Filter issues" {...f} />
      <ErrorMessage error={issues.error} />
      {issues.isPending && <LoadingSkeleton />}
      {issues.data && issues.data.total === 0 && (
        <EmptyState
          message={f.isFiltered ? 'No issues match these filters.' : 'No issues raised yet.'}
          onClear={f.isFiltered ? f.clear : undefined}
        />
      )}
      {issues.data && issues.data.total > 0 && (
        <>
          <ResultsSummary total={issues.data.total} noun={['issue', 'issues']} {...f} />
          <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
            <table>
              <caption className="sr-only">Issues, most severe first</caption>
              <thead>
                <tr>
                  <th scope="col">Issue</th>
                  <th scope="col">Severity</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="hidden sm:table-cell">
                    Action item
                  </th>
                  <th scope="col">Assignee</th>
                  <th scope="col" className="hidden sm:table-cell">
                    Meeting
                  </th>
                  <th scope="col" className="hidden sm:table-cell">
                    Raised
                  </th>
                </tr>
              </thead>
              <tbody>
                {issues.data.items.map((issue) => (
                  <tr key={issue.id}>
                    <td>
                      <Link to={`/issues/${issue.id}`} className="font-medium break-words">
                        {issue.title}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge kind="severity" value={issue.severity} />
                    </td>
                    <td>
                      <StatusBadge kind="issue" value={issue.status} />
                    </td>
                    <td className="hidden sm:table-cell">
                      <Link to={`/action-items/${issue.actionItem.id}`}>
                        {issue.actionItem.description}
                      </Link>
                    </td>
                    <td>{issue.actionItem.assignee.name}</td>
                    <td className="hidden sm:table-cell">
                      <Link to={`/meetings/${issue.meeting.id}`}>{issue.meeting.description}</Link>
                    </td>
                    <td className="hidden sm:table-cell">
                      {issue.raisedBy.name}, {formatDateTime(issue.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
