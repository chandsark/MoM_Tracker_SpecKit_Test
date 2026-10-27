import { Link } from 'react-router';
import { useMeetings } from '../api/meetings';
import { useAllUsers } from '../api/users';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { FilterBar, ResultsSummary, useUrlFilters } from '../components/FilterBar';
import { meetingFilterFields, userOptions } from '../lib/filters';
import { PlusIcon } from '../components/icons';
import { formatDate } from '../lib/format';
import { LoadingSkeleton } from '../components/Skeleton';

export function MeetingsListPage() {
  const users = useAllUsers();
  const fields = meetingFilterFields(userOptions(users.data?.items));
  const f = useUrlFilters(fields);
  const meetings = useMeetings(f.listQuery);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>Meetings</h1>
        <Link className="btn btn-primary" to="/meetings/new">
          <PlusIcon />
          New meeting
        </Link>
      </div>
      <FilterBar fields={fields} label="Filter meetings" {...f} />
      <ErrorMessage error={meetings.error} />
      {meetings.isPending && <LoadingSkeleton />}
      {meetings.data && meetings.data.total === 0 && (
        <EmptyState
          message={f.isFiltered ? 'No meetings match these filters.' : 'No meetings yet.'}
          onClear={f.isFiltered ? f.clear : undefined}
          action={f.isFiltered ? undefined : { label: 'New meeting', to: '/meetings/new' }}
        />
      )}
      {meetings.data && meetings.data.total > 0 && (
        <>
          <ResultsSummary total={meetings.data.total} noun={['meeting', 'meetings']} {...f} />
          <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
            <table>
              <caption className="sr-only">Meetings, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Meeting</th>
                  <th scope="col">Date</th>
                  <th scope="col" className="hidden sm:table-cell">
                    Organizer
                  </th>
                  <th scope="col">Action items</th>
                  <th scope="col" className="hidden sm:table-cell">
                    Open issues
                  </th>
                </tr>
              </thead>
              <tbody>
                {meetings.data.items.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/meetings/${m.id}`} className="font-medium break-words">
                        {m.description}
                      </Link>
                    </td>
                    <td>{formatDate(m.meetingDate)}</td>
                    <td className="hidden sm:table-cell">{m.organizer.name}</td>
                    <td>{m.actionItemCount}</td>
                    <td className="hidden sm:table-cell">{m.openIssueCount}</td>
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
