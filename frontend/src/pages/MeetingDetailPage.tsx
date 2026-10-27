import { Link, useParams } from 'react-router';
import { useCreateActionItem } from '../api/actionItems';
import { useMeeting, useTraceability } from '../api/meetings';
import { ActionItemForm } from '../components/ActionItemForm';
import { DeleteButton } from '../components/DeleteButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { HistoryTab } from '../components/HistoryTab';
import { SummaryCounts } from '../components/SummaryCounts';
import { useToast } from '../components/Toast';
import { TraceabilityTree } from '../components/TraceabilityTree';
import { formatDate } from '../lib/format';
import { LoadingSkeleton } from '../components/Skeleton';

export function MeetingDetailPage() {
  const id = useParams().id!;
  const meeting = useMeeting(id);
  const trace = useTraceability(id);
  const createItem = useCreateActionItem(id);
  const toast = useToast();

  if (meeting.isPending) return <LoadingSkeleton />;
  if (meeting.error) return <ErrorMessage error={meeting.error} />;
  const m = meeting.data;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>{m.description}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {m.permissions.canEdit && (
            <Link className="btn btn-secondary" to={`/meetings/${id}/edit`}>
              Edit meeting
            </Link>
          )}
          {m.permissions.canDelete && (
            <DeleteButton entityType="meeting" id={id} version={m.version} redirectTo="/meetings" />
          )}
        </div>
      </div>
      <p className="-mt-4 mb-6 text-muted">
        {formatDate(m.meetingDate)} · organized by {m.organizer.name}
      </p>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section aria-labelledby="items-heading" className="card">
            <h2 id="items-heading" className="mt-0 mb-4">
              Action items and issues
            </h2>
            <ErrorMessage error={trace.error} />
            {trace.isPending && <LoadingSkeleton />}
            {trace.data && (
              <div className="flex flex-col gap-6">
                <SummaryCounts summary={trace.data.summary} />
                <TraceabilityTree data={trace.data} />
              </div>
            )}
          </section>

          {m.permissions.canEdit && (
            <section aria-labelledby="add-item-heading">
              <h2 id="add-item-heading" className="mt-0 mb-4">
                Add an action item
              </h2>
              <ActionItemForm
                onSubmit={async (values) => {
                  await createItem.mutateAsync(values);
                  toast.success('Action item added');
                }}
              />
            </section>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="participants-heading" className="card">
            <h2 id="participants-heading" className="mt-0 mb-4">
              Participants
            </h2>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Participants">
              {m.participants.map((p) => (
                <li key={p.id} className="badge badge-neutral text-sm">
                  {p.user ? p.user.name : `${p.externalName} (external)`}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="meeting-history-heading" className="card">
            <h2 id="meeting-history-heading" className="mt-0 mb-4">
              History
            </h2>
            <HistoryTab entityType="meeting" id={id} />
          </section>
        </div>
      </div>
    </>
  );
}
