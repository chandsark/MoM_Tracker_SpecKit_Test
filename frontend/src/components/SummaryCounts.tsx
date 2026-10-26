import { ACTION_ITEM_STATUSES, ACTION_ITEM_STATUS_LABELS, type Traceability } from '@mom/shared';

/** Meeting summary as plain text counts (never colour alone). */
export function SummaryCounts({ summary }: { summary: Traceability['summary'] }) {
  return (
    <ul className="summary" aria-label="Summary">
      {ACTION_ITEM_STATUSES.map((s) => (
        <li key={s}>
          {ACTION_ITEM_STATUS_LABELS[s]}: <strong>{summary.actionItemsByStatus[s]}</strong>
        </li>
      ))}
      <li>
        Overdue: <strong>{summary.overdueCount}</strong>
      </li>
      <li>
        Open issues: <strong>{summary.openIssueCount}</strong>
      </li>
    </ul>
  );
}
