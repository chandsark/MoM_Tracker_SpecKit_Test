import { Link } from 'react-router';
import { useActionItems } from '../api/actionItems';
import { useIssues } from '../api/issues';
import { ActionItemSummary } from '../components/ActionItemRow';
import { ErrorMessage } from '../components/ErrorMessage';
import { IssueList } from '../components/IssueList';

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
      <div className="page-header">
        <h1>My work</h1>
        <Link className="button" to="/meetings/new">
          New meeting
        </Link>
      </div>

      <section aria-labelledby="my-items-heading" className="card">
        <h2 id="my-items-heading">My open action items</h2>
        <ErrorMessage error={myItems.error} />
        {myItems.isPending && <p role="status">Loading…</p>}
        {myItems.data && myItems.data.items.length === 0 && (
          <p className="muted">Nothing assigned to you right now.</p>
        )}
        {myItems.data && myItems.data.items.length > 0 && (
          <ul className="plain-list" aria-label="My open action items">
            {myItems.data.items.map((item) => (
              <li key={item.id}>
                <ActionItemSummary item={item} showMeeting />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="my-issues-heading" className="card">
        <h2 id="my-issues-heading">My open issues</h2>
        <ErrorMessage error={myIssues.error} />
        {myIssues.isPending && <p role="status">Loading…</p>}
        {myIssues.data && <IssueList issues={myIssues.data.items} showParent />}
      </section>
    </>
  );
}
