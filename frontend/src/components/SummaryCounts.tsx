import { ACTION_ITEM_STATUSES, ACTION_ITEM_STATUS_LABELS, type Traceability } from '@mom/shared';

/** Meeting summary as plain text counts (never colour alone). */
export function SummaryCounts({ summary }: { summary: Traceability['summary'] }) {
  const tiles: [string, number][] = [
    ...ACTION_ITEM_STATUSES.map((s): [string, number] => [
      ACTION_ITEM_STATUS_LABELS[s],
      summary.actionItemsByStatus[s],
    ]),
    ['Overdue', summary.overdueCount],
    ['Open issues', summary.openIssueCount],
  ];
  return (
    <ul
      className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-3 p-0 [overflow-wrap:normal]"
      aria-label="Summary"
    >
      {tiles.map(([label, count]) => (
        <li
          key={label}
          className="flex flex-col-reverse rounded-xl border border-border bg-surface px-4 py-3 shadow-sm"
        >
          <span className="text-sm text-muted">{label}: </span>
          <strong className="text-2xl font-bold">{count}</strong>
        </li>
      ))}
    </ul>
  );
}
