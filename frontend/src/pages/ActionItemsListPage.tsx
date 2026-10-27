import { Link } from 'react-router';
import { useActionItems } from '../api/actionItems';
import { localToday, toQueryString } from '../api/client';
import { useMeetings } from '../api/meetings';
import { useAllUsers } from '../api/users';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { FilterBar, ResultsSummary, useUrlFilters } from '../components/FilterBar';
import { StatusBadge } from '../components/StatusBadge';
import { actionItemFilterFields, userOptions } from '../lib/filters';
import { formatDate } from '../lib/format';
import { LoadingSkeleton } from '../components/Skeleton';

export function ActionItemsListPage() {
  const users = useAllUsers();
  const meetings = useMeetings({ pageSize: '200' });
  const fields = actionItemFilterFields(
    userOptions(users.data?.items, true),
    (meetings.data?.items ?? []).map((m) => ({
      value: m.id,
      label: `${m.description} (${formatDate(m.meetingDate)})`,
    })),
  );
  const f = useUrlFilters(fields);
  const items = useActionItems(f.listQuery);
  const exportHref = `/api/action-items/export.csv${toQueryString({ ...f.filters, today: localToday() })}`;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>Action items</h1>
        <a className="btn btn-secondary" href={exportHref} download>
          Export CSV
        </a>
      </div>
      <FilterBar fields={fields} label="Filter action items" {...f} />
      <ErrorMessage error={items.error} />
      {items.isPending && <LoadingSkeleton />}
      {items.data && items.data.total === 0 && (
        <EmptyState
          message={f.isFiltered ? 'No action items match these filters.' : 'No action items yet.'}
          onClear={f.isFiltered ? f.clear : undefined}
        />
      )}
      {items.data && items.data.total > 0 && (
        <>
          <ResultsSummary total={items.data.total} noun={['action item', 'action items']} {...f} />
          <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
            <table>
              <caption className="sr-only">Action items, earliest due date first</caption>
              <thead>
                <tr>
                  <th scope="col">Action item</th>
                  <th scope="col">Status</th>
                  <th scope="col">Assignee</th>
                  <th scope="col">Due</th>
                  <th scope="col" className="hidden sm:table-cell">
                    Meeting
                  </th>
                  <th scope="col" className="hidden sm:table-cell">
                    Open issues
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.data.items.map((item) => (
                  <tr key={item.id} className={item.isOverdue ? 'bg-warning-bg' : undefined}>
                    <td>
                      <Link to={`/action-items/${item.id}`} className="font-medium break-words">
                        {item.description}
                      </Link>
                    </td>
                    <td>
                      <span className="flex flex-wrap items-center gap-1">
                        <StatusBadge kind="action" value={item.status} />
                        {item.isOverdue && <StatusBadge kind="overdue" />}
                      </span>
                    </td>
                    <td>
                      {item.assignee.name}
                      {item.needsReassignment && (
                        <span className="text-muted"> (needs reassignment)</span>
                      )}
                    </td>
                    <td>{formatDate(item.dueDate)}</td>
                    <td className="hidden sm:table-cell">
                      <Link to={`/meetings/${item.meeting.id}`}>{item.meeting.description}</Link>
                    </td>
                    <td className="hidden sm:table-cell">{item.openIssueCount}</td>
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
