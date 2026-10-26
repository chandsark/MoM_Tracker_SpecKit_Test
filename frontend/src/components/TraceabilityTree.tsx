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
    <li>
      <div className="row" style={{ alignItems: 'center' }}>
        <Link to={`/action-items/${item.id}`}>{item.description}</Link>
        <StatusBadge kind="action" value={item.status} />
        {item.isOverdue && <StatusBadge kind="overdue" />}
        <span className="muted">
          {item.assignee.name} · due {formatDate(item.dueDate)}
        </span>
      </div>
      {item.issues.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}>
          No issues
        </p>
      ) : (
        <>
          {/* Disclosure pattern: the name stays fixed and aria-expanded carries the state. */}
          <button
            type="button"
            className="link"
            aria-expanded={expanded}
            aria-controls={issuesId}
            onClick={() => setExpanded((v) => !v)}
          >
            Issues ({item.issues.length})
            <span className="visually-hidden"> for {item.description}</span>
          </button>
          {expanded && (
            <ul id={issuesId} aria-label={`Issues for ${item.description}`}>
              {item.issues.map((issue) => (
                <li key={issue.id}>
                  <div className="row" style={{ alignItems: 'center' }}>
                    <Link to={`/issues/${issue.id}`}>{issue.title}</Link>
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
    <ul className="tree" aria-label="Traceability">
      <li>
        <strong>{data.meeting.description}</strong>{' '}
        <span className="muted">({formatDate(data.meeting.meetingDate)})</span>
        {data.actionItems.length === 0 ? (
          <p className="muted">No action items yet.</p>
        ) : (
          <ul aria-label="Action items">
            {data.actionItems.map((item) => (
              <ActionItemNode key={item.id} item={item} />
            ))}
          </ul>
        )}
      </li>
    </ul>
  );
}
