// Meeting → action items → issues tree with summary counts (FR-021, FR-023).
import { ACTION_ITEM_STATUSES, type ActionItemStatus, type Traceability } from '@mom/shared';
import { prisma } from '../db';
import { actionItemOrder, serializeActionItem } from '../actionItems/service';
import { serializeIssue } from '../issues/serialize';
import { itemInclude } from '../lib/context';
import type { PolicyUser } from '../policy';
import { getMeeting } from './service';

export async function getTraceability(
  user: PolicyUser,
  meetingId: string,
  today: string,
): Promise<Traceability> {
  const meeting = await getMeeting(user, meetingId); // 404 when missing or deleted
  // One query for the items and their issues; deleted records are excluded at both levels.
  const items = await prisma.actionItem.findMany({
    where: { meetingId, deletedAt: null },
    orderBy: actionItemOrder,
    include: {
      ...itemInclude,
      issues: {
        where: { deletedAt: null },
        include: { raisedBy: true },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      },
    },
  });

  const actionItemsByStatus = Object.fromEntries(ACTION_ITEM_STATUSES.map((s) => [s, 0])) as Record<
    ActionItemStatus,
    number
  >;
  let overdueCount = 0;
  let openIssueCount = 0;
  const actionItems = items.map(({ issues, ...item }) => {
    const serialized = serializeActionItem(item, today);
    actionItemsByStatus[serialized.status] += 1;
    if (serialized.isOverdue) overdueCount += 1;
    openIssueCount += serialized.openIssueCount;
    return {
      ...serialized,
      issues: issues.map((issue) => serializeIssue(user, { ...issue, actionItem: item })),
    };
  });

  return { meeting, summary: { actionItemsByStatus, overdueCount, openIssueCount }, actionItems };
}
