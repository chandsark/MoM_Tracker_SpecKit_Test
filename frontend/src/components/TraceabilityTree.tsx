import type { Traceability } from '@mom/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { formatDate } from '../lib/format';
import { StatusBadge } from './StatusBadge';

type TreeItem = Traceability['actionItems'][number];

function ActionItemNode({ item }: { item: TreeItem }) {
  const [expanded, setExpanded] = useState(true);
  const issuesId = `trace-issues-${item.id}`;

  return (
    <li className="rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={`/action-items/${item.id}`}
          className="inline-flex min-h-11 items-center font-medium break-words"
        >
          {item.description}
        </Link>
        <StatusBadge kind="action" value={item.status} />
        {item.isOverdue && <StatusBadge kind="overdue" />}
        <span className="text-sm text-muted">
          {item.assignee.name} · due {formatDate(item.dueDate)}
        </span>
      </div>
      {item.issues.length === 0 ? (
        <p className="m-0 text-sm text-muted">No issues</p>
      ) : (
        <>
          {/* Disclosure pattern: the name stays fixed and aria-expanded carries the state. */}
          <button
            type="button"
            className="btn-link text-sm"
            aria-expanded={expanded}
            aria-controls={issuesId}
            onClick={() => setExpanded((v) => !v)}
          >
            Issues ({item.issues.length})<span className="sr-only"> for {item.description}</span>
          </button>
          {expanded && (
            <ul
              id={issuesId}
              aria-label={`Issues for ${item.description}`}
              className="m-0 ml-2 list-none space-y-1 border-l-2 border-border pl-4"
            >
              {item.issues.map((issue) => (
                <li key={issue.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={`/issues/${issue.id}`}
                      className="inline-flex min-h-11 items-center break-words"
                    >
                      {issue.title}
                    </Link>
                    <StatusBadge kind="severity" value={issue.severity} />
                    <StatusBadge kind="issue" value={issue.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </li>
  );
}

/** Meeting → action items → issues as nested lists (FR-021). */
export function TraceabilityTree({ data }: { data: Traceability }) {
  return (
    <ul className="m-0 list-none p-0" aria-label="Traceability">
      <li>
        <strong>{data.meeting.description}</strong>{' '}
        <span className="text-sm text-muted">({formatDate(data.meeting.meetingDate)})</span>
        {data.actionItems.length === 0 ? (
          <p className="text-muted">No action items yet.</p>
        ) : (
          <ul aria-label="Action items" className="m-0 mt-3 list-none space-y-3 p-0">
            {data.actionItems.map((item) => (
              <ActionItemNode key={item.id} item={item} />
            ))}
          </ul>
        )}
      </li>
    </ul>
  );
}
