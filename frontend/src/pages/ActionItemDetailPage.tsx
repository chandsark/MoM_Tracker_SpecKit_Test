import { useParams } from 'react-router';
import { useActionItem } from '../api/actionItems';
import { useAddComment } from '../api/comments';
import { useCreateIssue } from '../api/issues';
import { ActionItemEditor } from '../components/ActionItemEditor';
import { Breadcrumb } from '../components/Breadcrumb';
import { CommentForm, CommentList } from '../components/CommentList';
import { DeleteButton } from '../components/DeleteButton';
import { ErrorMessage } from '../components/ErrorMessage';
import { HistoryTab } from '../components/HistoryTab';
import { IssueForm } from '../components/IssueForm';
import { IssueList } from '../components/IssueList';
import { StatusBadge } from '../components/StatusBadge';
import { Tabs } from '../components/Tabs';
import { formatDate } from '../lib/format';

export function ActionItemDetailPage() {
  const id = useParams().id!;
  const item = useActionItem(id);
  const addComment = useAddComment(id);
  const createIssue = useCreateIssue(id);

  if (item.isPending) return <p role="status">Loading…</p>;
  if (item.error) return <ErrorMessage error={item.error} />;
  const it = item.data;

  return (
    <>
      <Breadcrumb
        items={[
          { label: it.meeting.description, to: `/meetings/${it.meeting.id}` },
          { label: it.description },
        ]}
      />
      <div className="page-header">
        <h1>{it.description}</h1>
        {it.permissions.canDelete && (
          <DeleteButton
            entityType="action-item"
            id={it.id}
            version={it.version}
            redirectTo={`/meetings/${it.meeting.id}`}
            issues={it.issues}
          />
        )}
      </div>
      <dl className="card">
        <dt>Assignee</dt>
        <dd>
          {it.assignee.name}
          {it.needsReassignment && ' (no longer active — needs reassignment)'}
        </dd>
        <dt>Start date</dt>
        <dd>{formatDate(it.startDate)}</dd>
        <dt>Due date</dt>
        <dd>
          {formatDate(it.dueDate)} {it.isOverdue && <StatusBadge kind="overdue" />}
        </dd>
        <dt>Status</dt>
        <dd>
          <StatusBadge kind="action" value={it.status} />
        </dd>
        <dt>Meeting</dt>
        <dd>
          {it.meeting.description} ({formatDate(it.meeting.meetingDate)})
        </dd>
      </dl>

      <ActionItemEditor item={it} />

      <section aria-labelledby="issues-heading">
        <h2 id="issues-heading">Issues</h2>
        <p>
          <strong>
            {it.openIssueCount} open {it.openIssueCount === 1 ? 'issue' : 'issues'}
          </strong>
        </p>
        <IssueList issues={it.issues} />
        {it.permissions.canRaiseIssue && (
          <details>
            <summary>Raise an issue</summary>
            <IssueForm onSubmit={(values) => createIssue.mutateAsync(values)} />
          </details>
        )}
      </section>

      <Tabs
        label="Action item activity"
        tabs={[
          {
            label: 'Comments',
            content: (
              <section aria-label="Comments">
                <CommentList comments={it.comments} />
                {it.permissions.canComment && (
                  <CommentForm onSubmit={(body) => addComment.mutateAsync(body)} />
                )}
              </section>
            ),
          },
          { label: 'History', content: <HistoryTab entityType="action-item" id={it.id} /> },
        ]}
      />
    </>
  );
}
