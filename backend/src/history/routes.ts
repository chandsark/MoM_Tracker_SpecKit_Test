import {
  EntityPathSegment,
  SEGMENT_TO_ENTITY_TYPE,
  type HistoryAction,
  type HistoryEntry,
} from '@mom/shared';
import { Router } from 'express';
import { prisma } from '../db';
import { userRef } from '../lib/serialize';
import { asyncHandler } from '../middleware/validate';

export const historyRouter = Router().get(
  '/history/:entityType/:entityId',
  asyncHandler(async (req, res) => {
    const entityType = SEGMENT_TO_ENTITY_TYPE[EntityPathSegment.parse(req.params.entityType)];
    const rows = await prisma.changeHistory.findMany({
      where: { entityType, entityId: req.params.entityId! },
      include: { actor: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    const entries: HistoryEntry[] = rows.map((r) => ({
      id: r.id,
      action: r.action as HistoryAction,
      field: r.field,
      oldValue: r.oldValue,
      newValue: r.newValue,
      actor: userRef(r.actor),
      createdAt: r.createdAt.toISOString(),
    }));
    res.json(entries);
  }),
);
