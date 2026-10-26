import {
  SEVERITY_RANK,
  type Issue,
  type IssueCreate,
  type IssueFilters,
  type IssueStatus,
  type IssueUpdate,
  type Page,
} from '@mom/shared';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { pageResult, toSkipTake } from '../lib/pagination';
import { diffFields, writeHistory } from '../history';
import { StaleVersionError, loadActionItem, meetingContext } from '../lib/context';
import { fieldError, forbidden, notFound, versionConflict } from '../lib/errors';
import { canDelete, canEditIssue, canRaiseIssue, type PolicyUser } from '../policy';
import { softDelete } from '../softDelete/service';
import { issueInclude, serializeIssue, type IssueWithRels } from './serialize';
import { canTransitionIssue } from './transitions';

/** A visible issue: neither it, its action item, nor its meeting is soft-deleted. */
async function loadIssue(id: string): Promise<IssueWithRels> {
  const issue = await prisma.issue.findFirst({
    where: { id, deletedAt: null, actionItem: { deletedAt: null, meeting: { deletedAt: null } } },
    include: issueInclude,
  });
  if (!issue) throw notFound('Issue not found.');
  return issue;
}

/** Shared by the list endpoint and CSV export so both return exactly the same rows. */
export function buildIssueWhere(
  f: Omit<IssueFilters, 'page' | 'pageSize'>,
  user: PolicyUser,
): Prisma.IssueWhereInput {
  const actionItem: Prisma.ActionItemWhereInput = { deletedAt: null, meeting: { deletedAt: null } };
  if (f.assigneeId) actionItem.assigneeId = f.assigneeId === 'me' ? user.id : f.assigneeId;
  return {
    deletedAt: null,
    actionItem,
    ...(f.actionItemId ? { actionItemId: f.actionItemId } : {}),
    ...(f.status?.length ? { status: { in: f.status } } : {}),
    ...(f.severity?.length ? { severity: { in: f.severity } } : {}),
  };
}

/** Most severe first, then newest. */
export const issueOrder: Prisma.IssueOrderByWithRelationInput[] = [
  { severityRank: 'desc' },
  { createdAt: 'desc' },
  { id: 'desc' },
];

export async function listIssues(user: PolicyUser, filters: IssueFilters): Promise<Page<Issue>> {
  const where = buildIssueWhere(filters, user);
  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      include: issueInclude,
      orderBy: issueOrder,
      ...toSkipTake(filters),
    }),
    prisma.issue.count({ where }),
  ]);
  return pageResult(
    issues.map((i) => serializeIssue(user, i)),
    total,
  );
}

export async function getIssue(user: PolicyUser, id: string): Promise<Issue> {
  return serializeIssue(user, await loadIssue(id));
}

export async function createIssue(
  user: PolicyUser,
  actionItemId: string,
  input: IssueCreate,
): Promise<Issue> {
  const item = await loadActionItem(actionItemId);
  if (!canRaiseIssue(user, meetingContext(item.meeting), item)) throw forbidden();
  const issue = await prisma.$transaction(async (tx) => {
    const created = await tx.issue.create({
      data: {
        actionItemId,
        title: input.title,
        description: input.description,
        severity: input.severity,
        severityRank: SEVERITY_RANK[input.severity],
        raisedById: user.id,
      },
    });
    await writeHistory(tx, {
      entityType: 'ISSUE',
      entityId: created.id,
      action: 'CREATE',
      actorId: user.id,
    });
    return created;
  });
  return getIssue(user, issue.id);
}

/** Organizer-only soft delete of a single issue. */
export async function deleteIssue(user: PolicyUser, id: string, version: number): Promise<void> {
  const issue = await loadIssue(id);
  if (!canDelete(user, meetingContext(issue.actionItem.meeting))) throw forbidden();
  if (version !== issue.version) throw versionConflict(await getIssue(user, id));
  try {
    await prisma.$transaction((tx) => softDelete(tx, 'ISSUE', id, version, user));
  } catch (err) {
    if (err instanceof StaleVersionError) throw versionConflict(await getIssue(user, id));
    throw err;
  }
}

export async function updateIssue(
  user: PolicyUser,
  id: string,
  input: IssueUpdate,
): Promise<Issue> {
  const issue = await loadIssue(id);
  const item = issue.actionItem;
  if (!canEditIssue(user, meetingContext(item.meeting), item)) throw forbidden();
  if (input.version !== issue.version) throw versionConflict(await getIssue(user, id));
  if (input.status && !canTransitionIssue(issue.status as IssueStatus, input.status)) {
    throw fieldError('status', 'A resolved issue can only be reopened as Open.');
  }
  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.issue.updateMany({
        where: { id, version: input.version, deletedAt: null },
        data: {
          title: input.title,
          description: input.description,
          severity: input.severity,
          severityRank: input.severity ? SEVERITY_RANK[input.severity] : undefined,
          status: input.status,
          version: { increment: 1 },
        },
      });
      if (count === 0) throw new StaleVersionError();
      const changes = diffFields(issue, input, ['title', 'description', 'severity', 'status']);
      await writeHistory(tx, {
        entityType: 'ISSUE',
        entityId: id,
        action: 'UPDATE',
        actorId: user.id,
        changes,
      });
    });
  } catch (err) {
    if (err instanceof StaleVersionError) throw versionConflict(await getIssue(user, id));
    throw err;
  }
  return getIssue(user, id);
}
