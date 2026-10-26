import { Link, useParams } from 'react-router';
import { useCreateActionItem } from '../api/actionItems';
import { useMeeting, useTraceability } from '../api/meetings';
import { ActionItemForm } from '../components/ActionItemForm';
import { DeleteButton } from '../components/DeleteButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { HistoryTab } from '../components/HistoryTab';
import { SummaryCounts } from '../components/SummaryCounts';
import { TraceabilityTree } from '../components/TraceabilityTree';
import { formatDate } from '../lib/format';

export function MeetingDetailPage() {
  const id = useParams().id!;
  const meeting = useMeeting(id);
  const trace = useTraceability(id);
  const createItem = useCreateActionItem(id);

  if (meeting.isPending) return <p role="status">Loading…</p>;
  if (meeting.error) return <ErrorMessage error={meeting.error} />;
  const m = meeting.data;

  return (
    <>
      <div className="page-header">
        <h1>{m.description}</h1>
        <div className="row" style={{ alignItems: 'center' }}>
          {m.permissions.canEdit && (
            <Link className="button secondary" to={`/meetings/${id}/edit`}>
              Edit meeting
            </Link>
          )}
          {m.permissions.canDelete && (
            <DeleteButton entityType="meeting" id={id} version={m.version} redirectTo="/meetings" />
          )}
        </div>
      </div>
      <p className="muted">
        {formatDate(m.meetingDate)} · organized by {m.organizer.name}
      </p>

      <section aria-labelledby="participants-heading">
        <h2 id="participants-heading">Participants</h2>
        <ul className="row plain-list" aria-label="Participants">
          {m.participants.map((p) => (
            <li key={p.id} className="badge">
              {p.user ? p.user.name : `${p.externalName} (external)`}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="items-heading">
        <h2 id="items-heading">Action items and issues</h2>
        <ErrorMessage error={trace.error} />
        {trace.isPending && <p role="status">Loading…</p>}
        {trace.data && (
          <div className="card stack">
            <SummaryCounts summary={trace.data.summary} />
            <TraceabilityTree data={trace.data} />
          </div>
        )}
      </section>

      {m.permissions.canEdit && (
        <section aria-labelledby="add-item-heading">
          <h2 id="add-item-heading">Add an action item</h2>
          <ActionItemForm onSubmit={(values) => createItem.mutateAsync(values)} />
        </section>
      )}

      <section aria-labelledby="meeting-history-heading">
        <h2 id="meeting-history-heading">History</h2>
        <HistoryTab entityType="meeting" id={id} />
      </section>
    </>
  );
}
