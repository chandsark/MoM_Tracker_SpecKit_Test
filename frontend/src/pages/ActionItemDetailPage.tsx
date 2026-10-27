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
import { useToast } from '../components/Toast';
import { formatDate } from '../lib/format';
import { LoadingSkeleton } from '../components/Skeleton';

export function ActionItemDetailPage() {
  const id = useParams().id!;
  const item = useActionItem(id);
  const addComment = useAddComment(id);
  const createIssue = useCreateIssue(id);
  const toast = useToast();

  if (item.isPending) return <LoadingSkeleton />;
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
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
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <dl className="card m-0 grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr] [&_dd]:m-0 [&_dt]:text-sm [&_dt]:font-semibold [&_dt]:text-muted">
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

          <section aria-labelledby="issues-heading" className="card">
            <h2 id="issues-heading" className="mt-0 mb-4">
              Issues
            </h2>
            <p className="mt-0">
              <strong>
                {it.openIssueCount} open {it.openIssueCount === 1 ? 'issue' : 'issues'}
              </strong>
            </p>
            <IssueList issues={it.issues} />
            {it.permissions.canRaiseIssue && (
              <details className="mt-4">
                <summary className="btn btn-secondary list-none">Raise an issue</summary>
                <IssueForm
                  onSubmit={async (values) => {
                    await createIssue.mutateAsync(values);
                    toast.success('Issue raised');
                  }}
                />
              </details>
            )}
          </section>
        </div>

        <div className="card min-w-0 self-start">
          <Tabs
            label="Action item activity"
            tabs={[
              {
                label: 'Comments',
                content: (
                  <section aria-label="Comments">
                    <CommentList comments={it.comments} />
                    {it.permissions.canComment && (
                      <CommentForm
                        onSubmit={async (body) => {
                          await addComment.mutateAsync(body);
                          toast.success('Comment added');
                        }}
                      />
                    )}
                  </section>
                ),
              },
              { label: 'History', content: <HistoryTab entityType="action-item" id={it.id} /> },
            ]}
          />
        </div>
      </div>
    </>
  );
}
