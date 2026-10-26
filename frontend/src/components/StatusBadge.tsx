import {
  ACTION_ITEM_STATUS_LABELS,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUS_LABELS,
  type ActionItemStatus,
  type IssueSeverity,
  type IssueStatus,
} from '@mom/shared';

type Props =
  | { kind: 'action'; value: ActionItemStatus }
  | { kind: 'issue'; value: IssueStatus }
  | { kind: 'severity'; value: IssueSeverity }
  | { kind: 'overdue'; value?: undefined };

/** Status shown as a text label with colour as a secondary cue (WCAG 1.4.1). */
export function StatusBadge(props: Props) {
  if (props.kind === 'overdue') return <span className="badge badge-overdue">Overdue</span>;
  const label =
    props.kind === 'action'
      ? ACTION_ITEM_STATUS_LABELS[props.value]
      : props.kind === 'issue'
        ? ISSUE_STATUS_LABELS[props.value]
        : ISSUE_SEVERITY_LABELS[props.value];
  return <span className={`badge badge-${props.value.toLowerCase()}`}>{label}</span>;
}
