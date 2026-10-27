import { useParams } from 'react-router';
import { useIssue } from '../api/issues';
import { Breadcrumb } from '../components/Breadcrumb';
import { DeleteButton } from '../components/DeleteButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { HistoryTab } from '../components/HistoryTab';
import { IssueEditor } from '../components/IssueEditor';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../lib/format';
import { LoadingSkeleton } from '../components/Skeleton';

export function IssueDetailPage() {
  const id = useParams().id!;
  const issue = useIssue(id);

  if (issue.isPending) return <LoadingSkeleton />;
  if (issue.error) return <ErrorMessage error={issue.error} />;
  const i = issue.data;

  return (
    <>
      <Breadcrumb
        items={[
          { label: i.meeting.description, to: `/meetings/${i.meeting.id}` },
          { label: i.actionItem.description, to: `/action-items/${i.actionItem.id}` },
          { label: i.title },
        ]}
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>{i.title}</h1>
        {i.permissions.canDelete && (
          <DeleteButton
            entityType="issue"
            id={i.id}
            version={i.version}
            redirectTo={`/action-items/${i.actionItem.id}`}
          />
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <div className="card space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge kind="severity" value={i.severity} />
              <StatusBadge kind="issue" value={i.status} />
            </div>
            <p className="whitespace-pre-wrap">{i.description}</p>
            <p className="mb-0 text-sm text-muted">
              Raised by {i.raisedBy.name} on{' '}
              <time dateTime={i.createdAt}>{formatDateTime(i.createdAt)}</time> · action item
              assigned to {i.actionItem.assignee.name}
            </p>
          </div>
          <IssueEditor issue={i} />
        </div>
        <section aria-labelledby="issue-history-heading" className="card min-w-0 self-start">
          <h2 id="issue-history-heading" className="mt-0 mb-4">
            History
          </h2>
          <HistoryTab entityType="issue" id={i.id} />
        </section>
      </div>
    </>
  );
}
