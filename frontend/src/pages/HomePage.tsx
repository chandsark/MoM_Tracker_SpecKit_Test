import { Link } from 'react-router';
import { useActionItems } from '../api/actionItems';
import { useIssues } from '../api/issues';
import { ActionItemSummary } from '../components/ActionItemRow';
import { ErrorMessage } from '../components/ErrorMessage';
import { IssueList } from '../components/IssueList';
import { PlusIcon } from '../components/icons';
import { LoadingSkeleton } from '../components/Skeleton';

export function HomePage() {
  const myItems = useActionItems({
    assigneeId: 'me',
    status: 'OPEN,IN_PROGRESS,BLOCKED',
    pageSize: '100',
  });
  // Issues on action items assigned to me that still need attention.
  const myIssues = useIssues({ assigneeId: 'me', status: 'OPEN,IN_PROGRESS', pageSize: '100' });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>My work</h1>
        <Link className="btn btn-primary" to="/meetings/new">
          <PlusIcon />
          New meeting
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="my-items-heading" className="card">
          <h2 id="my-items-heading" className="mt-0 mb-4">
            My open action items
          </h2>
          <ErrorMessage error={myItems.error} />
          {myItems.isPending && <LoadingSkeleton />}
          {myItems.data && myItems.data.items.length === 0 && (
            <p className="text-muted">Nothing assigned to you right now.</p>
          )}
          {myItems.data && myItems.data.items.length > 0 && (
            <ul
              className="m-0 list-none divide-y divide-border p-0 [&>li]:py-3"
              aria-label="My open action items"
            >
              {myItems.data.items.map((item) => (
                <li key={item.id}>
                  <ActionItemSummary item={item} showMeeting />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="my-issues-heading" className="card">
          <h2 id="my-issues-heading" className="mt-0 mb-4">
            My open issues
          </h2>
          <ErrorMessage error={myIssues.error} />
          {myIssues.isPending && <LoadingSkeleton />}
          {myIssues.data && <IssueList issues={myIssues.data.items} showParent />}
        </section>
      </div>
    </>
  );
}
