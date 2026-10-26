// Authorization rules: the "Authorization matrix" in specs/001-meeting-action-tracker/data-model.md.
// Pure functions so every rule is unit-testable; routes call these before any change.
import type { Permissions } from '@mom/shared';

export interface PolicyUser {
  id: string;
  deactivatedAt: Date | null;
}

export interface MeetingContext {
  organizerId: string;
  /** Registered participants only; external participants have no account. */
  participantUserIds: string[];
}

export interface ItemContext {
  assigneeId: string;
}

const isActive = (user: PolicyUser) => user.deactivatedAt === null;
const isOrganizer = (user: PolicyUser, meeting: MeetingContext) =>
  isActive(user) && user.id === meeting.organizerId;
const isParticipant = (user: PolicyUser, meeting: MeetingContext) =>
  isActive(user) && meeting.participantUserIds.includes(user.id);
const isAssignee = (user: PolicyUser, item: ItemContext) =>
  isActive(user) && user.id === item.assigneeId;

export const canEditMeeting = isOrganizer;
export const canCreateActionItem = isOrganizer;
export const canReassign = isOrganizer;
export const canDelete = isOrganizer;
export const canRestore = isOrganizer;

export function canUpdateActionItem(user: PolicyUser, meeting: MeetingContext, item: ItemContext) {
  return isOrganizer(user, meeting) || isAssignee(user, item);
}

export function canComment(user: PolicyUser, meeting: MeetingContext, item: ItemContext) {
  return canUpdateActionItem(user, meeting, item) || isParticipant(user, meeting);
}

export const canRaiseIssue = canComment;
export const canEditIssue = canUpdateActionItem;

export function meetingPermissions(user: PolicyUser, meeting: MeetingContext): Permissions {
  return {
    canEdit: canEditMeeting(user, meeting),
    canReassign: false,
    canComment: false,
    canRaiseIssue: false,
    canDelete: canDelete(user, meeting),
  };
}

export function actionItemPermissions(
  user: PolicyUser,
  meeting: MeetingContext,
  item: ItemContext,
): Permissions {
  return {
    canEdit: canUpdateActionItem(user, meeting, item),
    canReassign: canReassign(user, meeting),
    canComment: canComment(user, meeting, item),
    canRaiseIssue: canRaiseIssue(user, meeting, item),
    canDelete: canDelete(user, meeting),
  };
}

export function issuePermissions(
  user: PolicyUser,
  meeting: MeetingContext,
  item: ItemContext,
): Permissions {
  return {
    canEdit: canEditIssue(user, meeting, item),
    canReassign: false,
    canComment: false,
    canRaiseIssue: false,
    canDelete: canDelete(user, meeting),
  };
}
