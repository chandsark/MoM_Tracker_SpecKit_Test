// Filter definitions for the three list screens (contracts/ui-routes.md). Names match the API
// query parameters in contracts/openapi.yaml.
import {
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
  ISSUE_SEVERITIES,
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
} from '@mom/shared';
import type { FilterField, FilterOption } from '../components/FilterBar';

const options = <T extends string>(
  values: readonly T[],
  labels: Record<T, string>,
): FilterOption[] => values.map((v) => ({ value: v, label: labels[v] }));

/** Users for a picker; `withMe` adds "Me" so a saved link works for whoever opens it. */
export function userOptions(
  users: { id: string; name: string }[] = [],
  withMe = false,
): FilterOption[] {
  return [
    ...(withMe ? [{ value: 'me', label: 'Me' }] : []),
    ...users.map((u) => ({ value: u.id, label: u.name })),
  ];
}

export function meetingFilterFields(participants: FilterOption[]): FilterField[] {
  return [
    { kind: 'date', name: 'from', label: 'From' },
    { kind: 'date', name: 'to', label: 'To' },
    { kind: 'select', name: 'participantId', label: 'Participant', options: participants },
    { kind: 'text', name: 'q', label: 'Keyword' },
  ];
}

export function actionItemFilterFields(
  assignees: FilterOption[],
  meetings: FilterOption[],
): FilterField[] {
  return [
    { kind: 'select', name: 'assigneeId', label: 'Assignee', options: assignees },
    {
      kind: 'multi',
      name: 'status',
      label: 'Status',
      options: options(ACTION_ITEM_STATUSES, ACTION_ITEM_STATUS_LABELS),
    },
    { kind: 'select', name: 'meetingId', label: 'Meeting', options: meetings },
    { kind: 'date', name: 'dueFrom', label: 'Due from' },
    { kind: 'date', name: 'dueTo', label: 'Due to' },
    { kind: 'flag', name: 'overdue', label: 'Overdue only' },
    { kind: 'text', name: 'q', label: 'Keyword' },
  ];
}

export function issueFilterFields(
  assignees: FilterOption[],
  actionItemLabel?: string,
): FilterField[] {
  return [
    {
      kind: 'multi',
      name: 'status',
      label: 'Status',
      options: options(ISSUE_STATUSES, ISSUE_STATUS_LABELS),
    },
    {
      kind: 'multi',
      name: 'severity',
      label: 'Severity',
      options: options(ISSUE_SEVERITIES, ISSUE_SEVERITY_LABELS),
    },
    { kind: 'select', name: 'assigneeId', label: 'Assignee', options: assignees },
    { kind: 'chip', name: 'actionItemId', label: 'Action item', display: actionItemLabel },
  ];
}
