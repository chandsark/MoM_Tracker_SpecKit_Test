import {
  ACTION_ITEM_STATUS_LABELS,
  type ActionItemFilters,
  type ActionItemStatus,
} from '@mom/shared';
import { prisma } from '../db';
import { openIssueWhere } from '../lib/context';
import { toCsv } from '../lib/csv';
import { isOverdue } from '../lib/dates';
import type { PolicyUser } from '../policy';
import { actionItemOrder, buildActionItemWhere } from './service';

const HEADERS = [
  'Action Item ID',
  'Description',
  'Assignee',
  'Start Date',
  'Due Date',
  'Status',
  'Overdue',
  'Open Issues',
  'Meeting ID',
  'Meeting Date',
  'Meeting Description',
  'Last Updated',
];

/** Every action item matching the list filters (pagination ignored), as CSV. */
export async function exportActionItemsCsv(
  user: PolicyUser,
  filters: ActionItemFilters,
  today: string,
): Promise<string> {
  const items = await prisma.actionItem.findMany({
    where: buildActionItemWhere(filters, user, today),
    orderBy: actionItemOrder,
    include: {
      assignee: { select: { name: true } },
      meeting: { select: { id: true, meetingDate: true, description: true } },
      _count: { select: { issues: { where: openIssueWhere } } },
    },
  });
  return toCsv(
    HEADERS,
    items.map((i) => [
      i.id,
      i.description,
      i.assignee.name,
      i.startDate,
      i.dueDate,
      ACTION_ITEM_STATUS_LABELS[i.status as ActionItemStatus],
      isOverdue(i.dueDate, i.status, today) ? 'Yes' : 'No',
      i._count.issues,
      i.meeting.id,
      i.meeting.meetingDate,
      i.meeting.description,
      i.updatedAt.toISOString(),
    ]),
  );
}
