import { z } from 'zod';
import { ActionItemStatus, IssueSeverity, IssueStatus } from '../enums';
import { dateString, pagination } from './common';

/** "OPEN,IN_PROGRESS" → ['OPEN', 'IN_PROGRESS'], validated against the enum. */
function csvList<T extends z.ZodType>(item: T) {
  return z.preprocess(
    (v) =>
      typeof v === 'string'
        ? v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : v,
    z.array(item).optional(),
  );
}

const booleanParam = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => (v === undefined ? undefined : v === 'true'));

const keyword = z.string().trim().max(100).optional();
const id = z.string().min(1).optional();

export const MeetingFilters = pagination
  .extend({
    from: dateString.optional(),
    to: dateString.optional(),
    participantId: id,
    q: keyword,
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, {
    message: 'The end date must be on or after the start date',
    path: ['to'],
  });
export type MeetingFilters = z.infer<typeof MeetingFilters>;

export const ActionItemFilters = pagination
  .extend({
    /** A user id, or "me" for the signed-in user. */
    assigneeId: id,
    status: csvList(ActionItemStatus),
    meetingId: id,
    dueFrom: dateString.optional(),
    dueTo: dateString.optional(),
    overdue: booleanParam,
    q: keyword,
    today: dateString.optional(),
  })
  .refine((f) => !f.dueFrom || !f.dueTo || f.dueFrom <= f.dueTo, {
    message: 'The end date must be on or after the start date',
    path: ['dueTo'],
  });
export type ActionItemFilters = z.infer<typeof ActionItemFilters>;

export const IssueFilters = pagination.extend({
  status: csvList(IssueStatus),
  severity: csvList(IssueSeverity),
  /** Assignee of the parent action item; a user id or "me". */
  assigneeId: id,
  actionItemId: id,
});
export type IssueFilters = z.infer<typeof IssueFilters>;
