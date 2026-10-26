import type { ActionItemDetail, Issue, Permissions } from '@mom/shared';

export const noPermissions: Permissions = {
  canEdit: false,
  canReassign: false,
  canComment: false,
  canRaiseIssue: false,
  canDelete: false,
};

export function makeItem(overrides: Partial<ActionItemDetail> = {}): ActionItemDetail {
  return {
    id: 'i1',
    version: 1,
    meeting: { id: 'm1', description: 'Weekly sync', meetingDate: '2026-10-20' },
    description: 'Prepare report',
    assignee: { id: 'u-arjun', name: 'Arjun', active: true },
    startDate: '2026-10-20',
    dueDate: '2026-10-30',
    status: 'OPEN',
    isOverdue: false,
    needsReassignment: false,
    openIssueCount: 0,
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
    permissions: { ...noPermissions, canEdit: true, canComment: true, canRaiseIssue: true },
    comments: [],
    issues: [],
    ...overrides,
  };
}

export function makeIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    id: 'is1',
    version: 1,
    title: 'Blocked on data',
    description: 'Waiting for the export',
    severity: 'HIGH',
    status: 'OPEN',
    raisedBy: { id: 'u-mei', name: 'Mei', active: true },
    actionItem: {
      id: 'i1',
      description: 'Prepare report',
      assignee: { id: 'u-arjun', name: 'Arjun', active: true },
    },
    meeting: { id: 'm1', description: 'Weekly sync', meetingDate: '2026-10-20' },
    permissions: { ...noPermissions, canEdit: true },
    createdAt: '2026-10-21T09:00:00.000Z',
    updatedAt: '2026-10-21T09:00:00.000Z',
    ...overrides,
  };
}
