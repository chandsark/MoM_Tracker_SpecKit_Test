// Response shapes from specs/001-meeting-action-tracker/contracts/openapi.yaml.
import type { ActionItemStatus, HistoryAction, IssueSeverity, IssueStatus } from './enums';

export interface UserRef {
  id: string;
  name: string;
  active: boolean;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface Permissions {
  canEdit: boolean;
  canReassign: boolean;
  canComment: boolean;
  canRaiseIssue: boolean;
  canDelete: boolean;
}

export interface MeetingRef {
  id: string;
  description: string;
  meetingDate: string;
}

export interface Participant {
  id: string;
  user: UserRef | null;
  externalName: string | null;
}

export interface MeetingSummary extends MeetingRef {
  organizer: UserRef;
  participantCount: number;
  actionItemCount: number;
  openIssueCount: number;
}

export interface Meeting extends MeetingSummary {
  version: number;
  participants: Participant[];
  permissions: Permissions;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  id: string;
  version: number;
  meeting: MeetingRef;
  description: string;
  assignee: UserRef;
  startDate: string;
  dueDate: string;
  status: ActionItemStatus;
  isOverdue: boolean;
  needsReassignment: boolean;
  openIssueCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  author: UserRef;
  body: string;
  createdAt: string;
}

export interface Issue {
  id: string;
  version: number;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  raisedBy: UserRef;
  actionItem: { id: string; description: string; assignee: UserRef };
  meeting: MeetingRef;
  permissions: Permissions;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItemDetail extends ActionItem {
  permissions: Permissions;
  comments: Comment[];
  issues: Issue[];
}

export interface Traceability {
  meeting: Meeting;
  summary: {
    actionItemsByStatus: Record<ActionItemStatus, number>;
    overdueCount: number;
    openIssueCount: number;
  };
  actionItems: (ActionItem & { issues: Issue[] })[];
}

export interface DeletionImpact {
  actionItemCount: number;
  issueCount: number;
  actionItems: {
    id: string;
    description: string;
    issueCount: number;
    issues: { id: string; title: string }[];
  }[];
}

export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  actor: UserRef;
  createdAt: string;
}

export interface DeletedRecord {
  entityType: 'meeting' | 'action-item' | 'issue';
  id: string;
  label: string;
  deletedAt: string;
  deletedBy: UserRef | null;
  deletionBatchId: string;
  dependentCount: number;
}
