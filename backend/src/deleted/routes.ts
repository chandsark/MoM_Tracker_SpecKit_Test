import { EntityPathSegment } from '@mom/shared';
import { Router } from 'express';
import { currentUser } from '../lib/serialize';
import { asyncHandler } from '../middleware/validate';
import { listDeleted, restore } from '../softDelete/service';

export const deletedRouter = Router();

deletedRouter.get(
  '/deleted',
  asyncHandler(async (req, res) => {
    res.json(await listDeleted(currentUser(req)));
  }),
);

deletedRouter.post(
  '/deleted/:entityType/:entityId/restore',
  asyncHandler(async (req, res) => {
    const segment = EntityPathSegment.parse(req.params.entityType);
    await restore(currentUser(req), segment, req.params.entityId!);
    res.status(204).end();
  }),
);
