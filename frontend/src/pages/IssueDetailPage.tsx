import { useParams } from 'react-router';
import { useIssue } from '../api/issues';
import { Breadcrumb } from '../components/Breadcrumb';
import { DeleteButton } from '../components/DeleteButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { HistoryTab } from '../components/HistoryTab';
import { IssueEditor } from '../components/IssueEditor';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../lib/format';

export function IssueDetailPage() {
  const id = useParams().id!;
  const issue = useIssue(id);

  if (issue.isPending) return <p role="status">Loading…</p>;
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
      <div className="page-header">
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
      <div className="card stack">
        <div className="row" style={{ alignItems: 'center' }}>
          <StatusBadge kind="severity" value={i.severity} />
          <StatusBadge kind="issue" value={i.status} />
        </div>
        <p style={{ whiteSpace: 'pre-wrap' }}>{i.description}</p>
        <p className="muted">
          Raised by {i.raisedBy.name} on{' '}
          <time dateTime={i.createdAt}>{formatDateTime(i.createdAt)}</time> · action item assigned
          to {i.actionItem.assignee.name}
        </p>
      </div>
      <IssueEditor issue={i} />
      <section aria-labelledby="issue-history-heading">
        <h2 id="issue-history-heading">History</h2>
        <HistoryTab entityType="issue" id={i.id} />
      </section>
    </>
  );
}
