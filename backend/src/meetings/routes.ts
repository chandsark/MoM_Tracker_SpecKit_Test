import { DeleteQuery, MeetingCreate, MeetingFilters, MeetingUpdate } from '@mom/shared';
import { Router } from 'express';
import { resolveToday } from '../lib/dates';
import { currentUser } from '../lib/serialize';
import { asyncHandler, parseQuery, validateBody } from '../middleware/validate';
import * as meetings from './service';
import { getTraceability } from './traceability';

export const meetingsRouter = Router();

meetingsRouter.get(
  '/meetings',
  asyncHandler(async (req, res) => {
    res.json(await meetings.listMeetings(parseQuery(MeetingFilters, req)));
  }),
);

meetingsRouter.post(
  '/meetings',
  validateBody(MeetingCreate),
  asyncHandler(async (req, res) => {
    res.status(201).json(await meetings.createMeeting(currentUser(req), req.body as MeetingCreate));
  }),
);

meetingsRouter.get(
  '/meetings/:meetingId',
  asyncHandler(async (req, res) => {
    res.json(await meetings.getMeeting(currentUser(req), req.params.meetingId!));
  }),
);

meetingsRouter.get(
  '/meetings/:meetingId/traceability',
  asyncHandler(async (req, res) => {
    const today = resolveToday(typeof req.query.today === 'string' ? req.query.today : undefined);
    res.json(await getTraceability(currentUser(req), req.params.meetingId!, today));
  }),
);

meetingsRouter.get(
  '/meetings/:meetingId/deletion-impact',
  asyncHandler(async (req, res) => {
    res.json(await meetings.deletionImpact(req.params.meetingId!));
  }),
);

meetingsRouter.delete(
  '/meetings/:meetingId',
  asyncHandler(async (req, res) => {
    const { version } = parseQuery(DeleteQuery, req);
    await meetings.deleteMeeting(currentUser(req), req.params.meetingId!, version);
    res.status(204).end();
  }),
);

meetingsRouter.patch(
  '/meetings/:meetingId',
  validateBody(MeetingUpdate),
  asyncHandler(async (req, res) => {
    res.json(
      await meetings.updateMeeting(
        currentUser(req),
        req.params.meetingId!,
        req.body as MeetingUpdate,
      ),
    );
  }),
);
