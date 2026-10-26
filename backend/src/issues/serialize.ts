import type { Issue, IssueSeverity, IssueStatus } from '@mom/shared';
import type { Prisma } from '@prisma/client';
import { meetingContext } from '../lib/context';
import { meetingRef, userRef } from '../lib/serialize';
import { issuePermissions, type PolicyUser } from '../policy';

export const issueInclude = {
  raisedBy: true,
  actionItem: {
    include: {
      assignee: true,
      meeting: { include: { participants: { select: { userId: true } } } },
    },
  },
} satisfies Prisma.IssueInclude;
export type IssueWithRels = Prisma.IssueGetPayload<{ include: typeof issueInclude }>;

export function serializeIssue(user: PolicyUser, issue: IssueWithRels): Issue {
  const item = issue.actionItem;
  return {
    id: issue.id,
    version: issue.version,
    title: issue.title,
    description: issue.description,
    severity: issue.severity as IssueSeverity,
    status: issue.status as IssueStatus,
    raisedBy: userRef(issue.raisedBy),
    actionItem: { id: item.id, description: item.description, assignee: userRef(item.assignee) },
    meeting: meetingRef(item.meeting),
    permissions: issuePermissions(user, meetingContext(item.meeting), item),
    createdAt: issue.createdAt.toISOString(),
    updatedAt: issue.updatedAt.toISOString(),
  };
}
