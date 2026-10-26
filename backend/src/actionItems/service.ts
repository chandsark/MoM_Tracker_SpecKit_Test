import {
  DUE_BEFORE_START_MESSAGE,
  TERMINAL_ACTION_ITEM_STATUSES,
  type ActionItem,
  type ActionItemCreate,
  type ActionItemDetail,
  type ActionItemFilters,
  type ActionItemStatus,
  type ActionItemUpdate,
  type Page,
} from '@mom/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { pageResult, toSkipTake } from '../lib/pagination';
import { diffFields, writeHistory } from '../history';
import { canTransitionActionItem } from './transitions';
import { issueInclude, serializeIssue } from '../issues/serialize';
import { isOverdue } from '../lib/dates';
import {
  StaleVersionError,
  itemInclude,
  loadActionItem,
  loadMeeting,
  meetingContext,
  type ItemWithRels,
} from '../lib/context';
import { AppError, fieldError, forbidden, versionConflict } from '../lib/errors';
import { meetingRef, userRef } from '../lib/serialize';
import {
  actionItemPermissions,
  canCreateActionItem,
  canDelete,
  canEditMeeting,
  canReassign,
  canUpdateActionItem,
  type PolicyUser,
} from '../policy';
import { softDelete } from '../softDelete/service';

export function serializeActionItem(item: ItemWithRels, today: string): ActionItem {
  const status = item.status as ActionItemStatus;
  return {
    id: item.id,
    version: item.version,
    meeting: meetingRef(item.meeting),
    description: item.description,
    assignee: userRef(item.assignee),
    startDate: item.startDate,
    dueDate: item.dueDate,
    status,
    isOverdue: isOverdue(item.dueDate, status, today),
    needsReassignment:
      item.assignee.deactivatedAt !== null && !TERMINAL_ACTION_ITEM_STATUSES.includes(status),
    openIssueCount: item._count.issues,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/** Shared by the list endpoint and CSV export so both return exactly the same rows. */
export function buildActionItemWhere(
  f: Omit<ActionItemFilters, 'page' | 'pageSize'>,
  user: PolicyUser,
  today: string,
): Prisma.ActionItemWhereInput {
  const and: Prisma.ActionItemWhereInput[] = [{ deletedAt: null, meeting: { deletedAt: null } }];
  if (f.assigneeId) and.push({ assigneeId: f.assigneeId === 'me' ? user.id : f.assigneeId });
  if (f.status?.length) and.push({ status: { in: f.status } });
  if (f.meetingId) and.push({ meetingId: f.meetingId });
  if (f.dueFrom) and.push({ dueDate: { gte: f.dueFrom } });
  if (f.dueTo) and.push({ dueDate: { lte: f.dueTo } });
  if (f.q) and.push({ description: { contains: f.q } });
  const terminal = [...TERMINAL_ACTION_ITEM_STATUSES];
  if (f.overdue === true) {
    and.push({ dueDate: { lt: today }, status: { notIn: terminal } });
  } else if (f.overdue === false) {
    and.push({ OR: [{ dueDate: { gte: today } }, { status: { in: terminal } }] });
  }
  return { AND: and };
}

export const actionItemOrder: Prisma.ActionItemOrderByWithRelationInput[] = [
  { dueDate: 'asc' },
  { createdAt: 'asc' },
  { id: 'asc' },
];

export async function listActionItems(
  user: PolicyUser,
  filters: ActionItemFilters,
  today: string,
): Promise<Page<ActionItem>> {
  const where = buildActionItemWhere(filters, user, today);
  const [items, total] = await Promise.all([
    prisma.actionItem.findMany({
      where,
      include: itemInclude,
      orderBy: actionItemOrder,
      ...toSkipTake(filters),
    }),
    prisma.actionItem.count({ where }),
  ]);
  return pageResult(
    items.map((i) => serializeActionItem(i, today)),
    total,
  );
}

export async function assertActiveAssignee(
  assigneeId: string,
): Promise<{ id: string; name: string }> {
  const user = await prisma.user.findFirst({
    where: { id: assigneeId, deactivatedAt: null },
    select: { id: true, name: true },
  });
  if (!user) throw fieldError('assigneeId', 'The assignee must be an active registered user.');
  return user;
}

export async function getActionItemDetail(
  user: PolicyUser,
  id: string,
  today: string,
): Promise<ActionItemDetail> {
  const item = await loadActionItem(id);
  const [comments, issues] = await Promise.all([
    prisma.comment.findMany({
      where: { actionItemId: id },
      include: { author: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.issue.findMany({
      where: { actionItemId: id, deletedAt: null },
      include: issueInclude,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
  ]);
  return {
    ...serializeActionItem(item, today),
    permissions: actionItemPermissions(user, meetingContext(item.meeting), item),
    comments: comments.map((c) => ({
      id: c.id,
      author: userRef(c.author),
      body: c.body,
      createdAt: c.createdAt.toISOString(),
    })),
    issues: issues.map((i) => serializeIssue(user, i)),
  };
}

export async function updateActionItem(
  user: PolicyUser,
  id: string,
  input: ActionItemUpdate,
  today: string,
): Promise<ActionItemDetail> {
  const item = await loadActionItem(id);
  const ctx = meetingContext(item.meeting);
  if (!canUpdateActionItem(user, ctx, item)) throw forbidden();
  const reassigning = input.assigneeId !== undefined && input.assigneeId !== item.assigneeId;
  if (reassigning && !canReassign(user, ctx)) {
    throw forbidden('Only the meeting organizer can reassign an action item.');
  }
  if (
    input.description !== undefined &&
    input.description !== item.description &&
    !canEditMeeting(user, ctx)
  ) {
    throw forbidden('Only the meeting organizer can change the description.');
  }
  if (input.version !== item.version)
    throw versionConflict(await getActionItemDetail(user, id, today));

  const startDate = input.startDate ?? item.startDate;
  const dueDate = input.dueDate ?? item.dueDate;
  if (dueDate < startDate) throw fieldError('dueDate', DUE_BEFORE_START_MESSAGE);

  const fromStatus = item.status as ActionItemStatus;
  if (input.status && !canTransitionActionItem(fromStatus, input.status)) {
    throw fieldError('status', 'Reopen a finished item as Open or In Progress first.');
  }

  // FR-016: finishing an item that still has open issues needs an explicit confirmation.
  if (
    input.status === 'DONE' &&
    fromStatus !== 'DONE' &&
    item._count.issues > 0 &&
    !input.confirmOpenIssues
  ) {
    throw new AppError(
      409,
      'OPEN_ISSUES_CONFIRMATION_REQUIRED',
      'This action item still has open issues. Confirm to mark it as Done.',
      { openIssueCount: item._count.issues },
    );
  }

  const newAssignee = reassigning ? await assertActiveAssignee(input.assigneeId!) : undefined;

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.actionItem.updateMany({
        where: { id, version: input.version, deletedAt: null },
        data: {
          description: input.description,
          assigneeId: input.assigneeId,
          startDate: input.startDate,
          dueDate: input.dueDate,
          status: input.status,
          version: { increment: 1 },
        },
      });
      if (count === 0) throw new StaleVersionError();
      const changes = diffFields(
        {
          description: item.description,
          assignee: { id: item.assignee.id, name: item.assignee.name },
          startDate: item.startDate,
          dueDate: item.dueDate,
          status: item.status,
        },
        {
          description: input.description,
          assignee: newAssignee,
          startDate: input.startDate,
          dueDate: input.dueDate,
          status: input.status,
        },
        ['description', 'assignee', 'startDate', 'dueDate', 'status'],
      );
      await writeHistory(tx, {
        entityType: 'ACTION_ITEM',
        entityId: id,
        action: 'UPDATE',
        actorId: user.id,
        changes,
      });
    });
  } catch (err) {
    if (err instanceof StaleVersionError)
      throw versionConflict(await getActionItemDetail(user, id, today));
    throw err;
  }
  return getActionItemDetail(user, id, today);
}

/** Organizer-only soft delete of the action item and its issues. */
export async function deleteActionItem(
  user: PolicyUser,
  id: string,
  version: number,
  today: string,
): Promise<void> {
  const item = await loadActionItem(id);
  if (!canDelete(user, meetingContext(item.meeting))) throw forbidden();
  if (version !== item.version) throw versionConflict(await getActionItemDetail(user, id, today));
  try {
    await prisma.$transaction((tx) => softDelete(tx, 'ACTION_ITEM', id, version, user));
  } catch (err) {
    if (err instanceof StaleVersionError)
      throw versionConflict(await getActionItemDetail(user, id, today));
    throw err;
  }
}

export async function createActionItem(
  user: PolicyUser,
  meetingId: string,
  input: ActionItemCreate,
  today: string,
): Promise<ActionItemDetail> {
  const meeting = await loadMeeting(meetingId);
  if (!canCreateActionItem(user, meetingContext(meeting))) throw forbidden();
  await assertActiveAssignee(input.assigneeId);
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.actionItem.create({
      data: {
        meetingId,
        description: input.description,
        assigneeId: input.assigneeId,
        startDate: input.startDate,
        dueDate: input.dueDate,
        status: input.status ?? 'OPEN',
        createdById: user.id,
      },
      include: itemInclude,
    });
    await writeHistory(tx, {
      entityType: 'ACTION_ITEM',
      entityId: created.id,
      action: 'CREATE',
      actorId: user.id,
    });
    return created;
  });
  return getActionItemDetail(user, item.id, today);
}
