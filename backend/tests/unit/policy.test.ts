import { describe, expect, it } from 'vitest';
import {
  actionItemPermissions,
  canComment,
  canCreateActionItem,
  canDelete,
  canEditIssue,
  canEditMeeting,
  canRaiseIssue,
  canReassign,
  canRestore,
  canUpdateActionItem,
  meetingPermissions,
  type PolicyUser,
} from '../../src/policy';

const organizer: PolicyUser = { id: 'org', deactivatedAt: null };
const assignee: PolicyUser = { id: 'asg', deactivatedAt: null };
const participant: PolicyUser = { id: 'par', deactivatedAt: null };
const other: PolicyUser = { id: 'oth', deactivatedAt: null };
const deactivatedOrganizer: PolicyUser = { id: 'org', deactivatedAt: new Date() };

// The external participant has no user account, so only registered user ids appear here.
const meeting = { organizerId: 'org', participantUserIds: ['par', 'asg'] };
const item = { assigneeId: 'asg' };

type Row = [string, PolicyUser, boolean];

function check(fn: (u: PolicyUser) => boolean, rows: Row[]) {
  it.each(rows)('%s → %s', (_label, user, expected) => {
    expect(fn(user)).toBe(expected);
  });
}

describe('authorization matrix (data-model.md)', () => {
  describe('edit meeting: organizer only', () => {
    check(
      (u) => canEditMeeting(u, meeting),
      [
        ['organizer', organizer, true],
        ['assignee', assignee, false],
        ['participant', participant, false],
        ['other', other, false],
      ],
    );
  });

  describe('create action item: organizer only', () => {
    check(
      (u) => canCreateActionItem(u, meeting),
      [
        ['organizer', organizer, true],
        ['assignee', assignee, false],
        ['participant', participant, false],
        ['other', other, false],
      ],
    );
  });

  describe('change status / dates: organizer + assignee', () => {
    check(
      (u) => canUpdateActionItem(u, meeting, item),
      [
        ['organizer', organizer, true],
        ['assignee', assignee, true],
        ['participant', participant, false],
        ['other', other, false],
      ],
    );
  });

  describe('reassign: organizer only', () => {
    check(
      (u) => canReassign(u, meeting),
      [
        ['organizer', organizer, true],
        ['assignee', assignee, false],
        ['participant', participant, false],
        ['other', other, false],
      ],
    );
  });

  describe('comment: organizer + assignee + participant', () => {
    check(
      (u) => canComment(u, meeting, item),
      [
        ['organizer', organizer, true],
        ['assignee', assignee, true],
        ['participant', participant, true],
        ['other', other, false],
      ],
    );
  });

  describe('raise issue: organizer + assignee + participant', () => {
    check(
      (u) => canRaiseIssue(u, meeting, item),
      [
        ['organizer', organizer, true],
        ['assignee', assignee, true],
        ['participant', participant, true],
        ['other', other, false],
      ],
    );
  });

  describe('edit issue: organizer + assignee of the item', () => {
    check(
      (u) => canEditIssue(u, meeting, item),
      [
        ['organizer', organizer, true],
        ['assignee', assignee, true],
        ['participant', participant, false],
        ['other', other, false],
      ],
    );
  });

  describe('delete / restore: organizer only', () => {
    check(
      (u) => canDelete(u, meeting) && canRestore(u, meeting),
      [
        ['organizer', organizer, true],
        ['assignee', assignee, false],
        ['participant', participant, false],
        ['other', other, false],
      ],
    );
  });

  it('assignee who is not a participant still gets assignee rights', () => {
    const m = { organizerId: 'org', participantUserIds: [] };
    expect(canUpdateActionItem(assignee, m, item)).toBe(true);
    expect(canComment(assignee, m, item)).toBe(true);
  });

  it('grants nothing to a deactivated user', () => {
    expect(canEditMeeting(deactivatedOrganizer, meeting)).toBe(false);
    expect(canUpdateActionItem(deactivatedOrganizer, meeting, item)).toBe(false);
    expect(canComment(deactivatedOrganizer, meeting, item)).toBe(false);
    expect(canDelete(deactivatedOrganizer, meeting)).toBe(false);
  });
});

describe('permission objects', () => {
  it('describes what an assignee may do on an action item', () => {
    expect(actionItemPermissions(assignee, meeting, item)).toEqual({
      canEdit: true,
      canReassign: false,
      canComment: true,
      canRaiseIssue: true,
      canDelete: false,
    });
  });

  it('describes what an organizer may do on a meeting', () => {
    expect(meetingPermissions(organizer, meeting)).toEqual({
      canEdit: true,
      canReassign: false,
      canComment: false,
      canRaiseIssue: false,
      canDelete: true,
    });
  });
});
