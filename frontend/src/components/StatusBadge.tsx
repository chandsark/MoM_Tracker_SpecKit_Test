import {
  ACTION_ITEM_STATUS_LABELS,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUS_LABELS,
  type ActionItemStatus,
  type IssueSeverity,
  type IssueStatus,
} from '@mom/shared';
import { ClockIcon } from './icons';

type Props =
  | { kind: 'action'; value: ActionItemStatus }
  | { kind: 'issue'; value: IssueStatus }
  | { kind: 'severity'; value: IssueSeverity }
  | { kind: 'overdue'; value?: undefined };

type Variant = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

/** Badge mapping from contracts/design-system.md §3; unlisted values fall back to neutral. */
const VARIANTS: Partial<Record<ActionItemStatus | IssueStatus | IssueSeverity, Variant>> = {
  IN_PROGRESS: 'info',
  MEDIUM: 'info',
  BLOCKED: 'warning',
  HIGH: 'warning',
  DONE: 'success',
  RESOLVED: 'success',
  LOW: 'success',
  CRITICAL: 'danger',
};

/** Status shown as a text label with colour as a secondary cue (WCAG 1.4.1). */
export function StatusBadge(props: Props) {
  if (props.kind === 'overdue')
    return (
      <span className="badge badge-warning">
        <ClockIcon className="size-3.5" />
        Overdue
      </span>
    );
  const label =
    props.kind === 'action'
      ? ACTION_ITEM_STATUS_LABELS[props.value]
      : props.kind === 'issue'
        ? ISSUE_STATUS_LABELS[props.value]
        : ISSUE_SEVERITY_LABELS[props.value];
  return <span className={`badge badge-${VARIANTS[props.value] ?? 'neutral'}`}>{label}</span>;
}
