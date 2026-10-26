import { ActionItemCreate, ActionItemFilters, ActionItemUpdate, DeleteQuery } from '@mom/shared';
import { Router, type Request } from 'express';
import { sendCsv } from '../lib/csv';
import { resolveToday } from '../lib/dates';
import { currentUser } from '../lib/serialize';
import { asyncHandler, parseQuery, validateBody } from '../middleware/validate';
import { exportActionItemsCsv } from './csv';
import * as items from './service';

export const actionItemsRouter = Router();

const today = (req: Request) =>
  resolveToday(typeof req.query.today === 'string' ? req.query.today : undefined);

actionItemsRouter.get(
  '/action-items',
  asyncHandler(async (req, res) => {
    const filters = parseQuery(ActionItemFilters, req);
    res.json(await items.listActionItems(currentUser(req), filters, resolveToday(filters.today)));
  }),
);

// Registered before /action-items/:actionItemId so "export.csv" is not taken as an id.
actionItemsRouter.get(
  '/action-items/export.csv',
  asyncHandler(async (req, res) => {
    const filters = parseQuery(ActionItemFilters, req);
    sendCsv(
      res,
      'action-items',
      await exportActionItemsCsv(currentUser(req), filters, resolveToday(filters.today)),
    );
  }),
);

actionItemsRouter.post(
  '/meetings/:meetingId/action-items',
  validateBody(ActionItemCreate),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await items.createActionItem(
          currentUser(req),
          req.params.meetingId!,
          req.body as ActionItemCreate,
          today(req),
        ),
      );
  }),
);

actionItemsRouter.patch(
  '/action-items/:actionItemId',
  validateBody(ActionItemUpdate),
  asyncHandler(async (req, res) => {
    res.json(
      await items.updateActionItem(
        currentUser(req),
        req.params.actionItemId!,
        req.body as ActionItemUpdate,
        today(req),
      ),
    );
  }),
);

actionItemsRouter.delete(
  '/action-items/:actionItemId',
  asyncHandler(async (req, res) => {
    const { version } = parseQuery(DeleteQuery, req);
    await items.deleteActionItem(currentUser(req), req.params.actionItemId!, version, today(req));
    res.status(204).end();
  }),
);

actionItemsRouter.get(
  '/action-items/:actionItemId',
  asyncHandler(async (req, res) => {
    res.json(
      await items.getActionItemDetail(currentUser(req), req.params.actionItemId!, today(req)),
    );
  }),
);
