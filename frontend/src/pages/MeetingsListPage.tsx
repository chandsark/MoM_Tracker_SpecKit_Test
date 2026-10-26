import { Link } from 'react-router';
import { useMeetings } from '../api/meetings';
import { useAllUsers } from '../api/users';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { FilterBar, ResultsSummary, useUrlFilters } from '../components/FilterBar';
import { meetingFilterFields, userOptions } from '../lib/filters';
import { formatDate } from '../lib/format';

export function MeetingsListPage() {
  const users = useAllUsers();
  const fields = meetingFilterFields(userOptions(users.data?.items));
  const f = useUrlFilters(fields);
  const meetings = useMeetings(f.listQuery);

  return (
    <>
      <div className="page-header">
        <h1>Meetings</h1>
        <Link className="button" to="/meetings/new">
          New meeting
        </Link>
      </div>
      <FilterBar fields={fields} label="Filter meetings" {...f} />
      <ErrorMessage error={meetings.error} />
      {meetings.isPending && <p role="status">Loading…</p>}
      {meetings.data && meetings.data.total === 0 && (
        <EmptyState
          message={f.isFiltered ? 'No meetings match these filters.' : 'No meetings yet.'}
          onClear={f.isFiltered ? f.clear : undefined}
        />
      )}
      {meetings.data && meetings.data.total > 0 && (
        <>
          <ResultsSummary total={meetings.data.total} noun={['meeting', 'meetings']} {...f} />
          <div className="table-wrap">
            <table>
              <caption className="visually-hidden">Meetings, newest first</caption>
              <thead>
                <tr>
                  <th scope="col">Meeting</th>
                  <th scope="col">Date</th>
                  <th scope="col">Organizer</th>
                  <th scope="col">Action items</th>
                  <th scope="col">Open issues</th>
                </tr>
              </thead>
              <tbody>
                {meetings.data.items.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/meetings/${m.id}`}>{m.description}</Link>
                    </td>
                    <td>{formatDate(m.meetingDate)}</td>
                    <td>{m.organizer.name}</td>
                    <td>{m.actionItemCount}</td>
                    <td>{m.openIssueCount}</td>
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
