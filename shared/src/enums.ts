import { z } from 'zod';

export const ACTION_ITEM_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'BLOCKED',
  'DONE',
  'CANCELLED',
] as const;
export const ActionItemStatus = z.enum(ACTION_ITEM_STATUSES, { message: 'Choose a status' });
export type ActionItemStatus = z.infer<typeof ActionItemStatus>;

/** Statuses that end an action item; overdue never applies to them. */
export const TERMINAL_ACTION_ITEM_STATUSES: readonly ActionItemStatus[] = ['DONE', 'CANCELLED'];

export const ISSUE_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
export const IssueStatus = z.enum(ISSUE_STATUSES, { message: 'Choose a status' });
export type IssueStatus = z.infer<typeof IssueStatus>;

export const ISSUE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const IssueSeverity = z.enum(ISSUE_SEVERITIES, { message: 'Choose a severity' });
export type IssueSeverity = z.infer<typeof IssueSeverity>;

export const SEVERITY_RANK: Record<IssueSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const ACTION_ITEM_STATUS_LABELS: Record<ActionItemStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const ENTITY_TYPES = ['MEETING', 'ACTION_ITEM', 'ISSUE'] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

/** URL path segment used by the API for each entity type. */
export const ENTITY_PATH_SEGMENTS = ['meeting', 'action-item', 'issue'] as const;
export const EntityPathSegment = z.enum(ENTITY_PATH_SEGMENTS);
export type EntityPathSegment = z.infer<typeof EntityPathSegment>;

export const SEGMENT_TO_ENTITY_TYPE: Record<EntityPathSegment, EntityType> = {
  meeting: 'MEETING',
  'action-item': 'ACTION_ITEM',
  issue: 'ISSUE',
};

export const HISTORY_ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE'] as const;
export type HistoryAction = (typeof HISTORY_ACTIONS)[number];
