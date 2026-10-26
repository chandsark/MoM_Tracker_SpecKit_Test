import {
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUS_LABELS,
  type IssueFilters,
  type IssueSeverity,
  type IssueStatus,
} from '@mom/shared';
import { prisma } from '../db';
import { toCsv } from '../lib/csv';
import type { PolicyUser } from '../policy';
import { buildIssueWhere, issueOrder } from './service';

const HEADERS = [
  'Issue ID',
  'Title',
  'Description',
  'Severity',
  'Status',
  'Raised By',
  'Raised On',
  'Action Item ID',
  'Action Item',
  'Action Item Assignee',
  'Meeting ID',
  'Meeting Date',
  'Meeting Description',
];

/** Every issue matching the list filters (pagination ignored), as CSV. */
export async function exportIssuesCsv(user: PolicyUser, filters: IssueFilters): Promise<string> {
  const issues = await prisma.issue.findMany({
    where: buildIssueWhere(filters, user),
    orderBy: issueOrder,
    include: {
      raisedBy: { select: { name: true } },
      actionItem: {
        select: {
          id: true,
          description: true,
          assignee: { select: { name: true } },
          meeting: { select: { id: true, meetingDate: true, description: true } },
        },
      },
    },
  });
  return toCsv(
    HEADERS,
    issues.map((i) => [
      i.id,
      i.title,
      i.description,
      ISSUE_SEVERITY_LABELS[i.severity as IssueSeverity],
      ISSUE_STATUS_LABELS[i.status as IssueStatus],
      i.raisedBy.name,
      i.createdAt.toISOString(),
      i.actionItem.id,
      i.actionItem.description,
      i.actionItem.assignee.name,
      i.actionItem.meeting.id,
      i.actionItem.meeting.meetingDate,
      i.actionItem.meeting.description,
    ]),
  );
}
