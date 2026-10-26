// Batch soft delete and restore (research R7, FR-025, FR-028). Deleting a record marks it and its
// not-yet-deleted descendants with one deletionBatchId; restoring clears the whole batch, so records
// deleted earlier on their own stay deleted.
import { randomUUID } from 'node:crypto';
import {
  SEGMENT_TO_ENTITY_TYPE,
  type DeletedRecord,
  type EntityPathSegment,
  type EntityType,
} from '@mom/shared';
import { prisma, type Tx } from '../db';
import { StaleVersionError } from '../lib/context';
import { AppError, forbidden, notFound } from '../lib/errors';
import { userRef } from '../lib/serialize';
import { canRestore, type PolicyUser } from '../policy';

interface Affected {
  meetings: string[];
  actionItems: string[];
  issues: string[];
}

async function writeBatchHistory(
  tx: Tx,
  affected: Affected,
  action: 'DELETE' | 'RESTORE',
  actorId: string,
) {
  const rows = [
    ...affected.meetings.map((entityId) => ({ entityType: 'MEETING', entityId })),
    ...affected.actionItems.map((entityId) => ({ entityType: 'ACTION_ITEM', entityId })),
    ...affected.issues.map((entityId) => ({ entityType: 'ISSUE', entityId })),
  ];
  await tx.changeHistory.createMany({ data: rows.map((r) => ({ ...r, action, actorId })) });
}

/**
 * Soft-deletes a record (if still at `version`) and its non-deleted descendants in one batch.
 * Throws StaleVersionError when the record changed or was deleted meanwhile.
 */
export async function softDelete(
  tx: Tx,
  entityType: EntityType,
  id: string,
  version: number,
  actor: PolicyUser,
): Promise<void> {
  const stamp = { deletedAt: new Date(), deletedById: actor.id, deletionBatchId: randomUUID() };
  const root = { id, version, deletedAt: null };
  const affected: Affected = { meetings: [], actionItems: [], issues: [] };

  let count: number;
  if (entityType === 'MEETING') {
    ({ count } = await tx.meeting.updateMany({ where: root, data: stamp }));
    affected.meetings.push(id);
  } else if (entityType === 'ACTION_ITEM') {
    ({ count } = await tx.actionItem.updateMany({ where: root, data: stamp }));
    affected.actionItems.push(id);
  } else {
    ({ count } = await tx.issue.updateMany({ where: root, data: stamp }));
    affected.issues.push(id);
  }
  if (count === 0) throw new StaleVersionError();

  if (entityType === 'MEETING') {
    const items = await tx.actionItem.findMany({
      where: { meetingId: id, deletedAt: null },
      select: { id: true },
    });
    affected.actionItems.push(...items.map((i) => i.id));
  }
  if (entityType !== 'ISSUE') {
    const issues = await tx.issue.findMany({
      where: { actionItemId: { in: affected.actionItems }, deletedAt: null },
      select: { id: true },
    });
    affected.issues.push(...issues.map((i) => i.id));
  }
  await tx.actionItem.updateMany({
    where: { id: { in: affected.actionItems }, deletedAt: null },
    data: stamp,
  });
  await tx.issue.updateMany({
    where: { id: { in: affected.issues }, deletedAt: null },
    data: stamp,
  });
  await writeBatchHistory(tx, affected, 'DELETE', actor.id);
}

/** A deleted record with what restore needs: its batch, organizer, and whether a parent is deleted. */
async function loadDeleted(entityType: EntityType, id: string) {
  const deleted = { id, deletedAt: { not: null } };
  if (entityType === 'MEETING') {
    const m = await prisma.meeting.findFirst({ where: deleted });
    return m && { batchId: m.deletionBatchId!, organizerId: m.organizerId, parentDeleted: false };
  }
  if (entityType === 'ACTION_ITEM') {
    const i = await prisma.actionItem.findFirst({ where: deleted, include: { meeting: true } });
    return (
      i && {
        batchId: i.deletionBatchId!,
        organizerId: i.meeting.organizerId,
        parentDeleted: i.meeting.deletedAt !== null,
      }
    );
  }
  const issue = await prisma.issue.findFirst({
    where: deleted,
    include: { actionItem: { include: { meeting: true } } },
  });
  const item = issue?.actionItem;
  return (
    issue &&
    item && {
      batchId: issue.deletionBatchId!,
      organizerId: item.meeting.organizerId,
      parentDeleted: item.deletedAt !== null || item.meeting.deletedAt !== null,
    }
  );
}

/** Restores a deleted record together with everything deleted in the same batch. */
export async function restore(
  user: PolicyUser,
  segment: EntityPathSegment,
  id: string,
): Promise<void> {
  const entityType = SEGMENT_TO_ENTITY_TYPE[segment];
  const record = await loadDeleted(entityType, id);
  if (!record) throw notFound('Deleted record not found.');
  if (!canRestore(user, { organizerId: record.organizerId, participantUserIds: [] }))
    throw forbidden();
  if (record.parentDeleted) {
    throw new AppError(
      409,
      'PARENT_DELETED',
      'Restore the meeting or action item this belongs to first.',
    );
  }

  await prisma.$transaction(async (tx) => {
    const inBatch = { where: { deletionBatchId: record.batchId }, select: { id: true } };
    const [meetings, actionItems, issues] = await Promise.all([
      tx.meeting.findMany(inBatch),
      tx.actionItem.findMany(inBatch),
      tx.issue.findMany(inBatch),
    ]);
    const clear = { deletedAt: null, deletedById: null, deletionBatchId: null };
    const batch = { deletionBatchId: record.batchId };
    await tx.meeting.updateMany({ where: batch, data: clear });
    await tx.actionItem.updateMany({ where: batch, data: clear });
    await tx.issue.updateMany({ where: batch, data: clear });
    await writeBatchHistory(
      tx,
      {
        meetings: meetings.map((r) => r.id),
        actionItems: actionItems.map((r) => r.id),
        issues: issues.map((r) => r.id),
      },
      'RESTORE',
      user.id,
    );
  });
}

const SEGMENT: Record<EntityType, DeletedRecord['entityType']> = {
  MEETING: 'meeting',
  ACTION_ITEM: 'action-item',
  ISSUE: 'issue',
};

interface DeletedRow {
  type: EntityType;
  id: string;
  label: string;
  deletedAt: Date | null;
  deletedBy: { id: string; name: string; deactivatedAt: Date | null } | null;
  deletionBatchId: string | null;
}

/**
 * Deleted records in meetings the user organizes: one entry per batch, named after its top-most
 * record (meeting, else action item, else issue), newest deletion first.
 */
export async function listDeleted(user: PolicyUser): Promise<DeletedRecord[]> {
  const isDeleted = { deletedAt: { not: null } };
  const [meetings, items, issues] = await Promise.all([
    prisma.meeting.findMany({
      where: { ...isDeleted, organizerId: user.id },
      include: { deletedBy: true },
    }),
    prisma.actionItem.findMany({
      where: { ...isDeleted, meeting: { organizerId: user.id } },
      include: { deletedBy: true },
    }),
    prisma.issue.findMany({
      where: { ...isDeleted, actionItem: { meeting: { organizerId: user.id } } },
      include: { deletedBy: true },
    }),
  ]);

  // Meetings, then items, then issues: the first row seen for a batch is its top-most record.
  const rows: DeletedRow[] = [
    ...meetings.map((m) => ({ ...m, type: 'MEETING' as const, label: m.description })),
    ...items.map((i) => ({ ...i, type: 'ACTION_ITEM' as const, label: i.description })),
    ...issues.map((i) => ({ ...i, type: 'ISSUE' as const, label: i.title })),
  ];

  const batches = new Map<string, DeletedRecord>();
  for (const r of rows) {
    const existing = batches.get(r.deletionBatchId!);
    if (existing) {
      existing.dependentCount += 1;
      continue;
    }
    batches.set(r.deletionBatchId!, {
      entityType: SEGMENT[r.type],
      id: r.id,
      label: r.label,
      deletedAt: r.deletedAt!.toISOString(),
      deletedBy: r.deletedBy ? userRef(r.deletedBy) : null,
      deletionBatchId: r.deletionBatchId!,
      dependentCount: 0,
    });
  }
  return [...batches.values()].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));
}
