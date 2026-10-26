import { z } from 'zod';
import { ActionItemStatus } from '../enums';
import { dateString, requiredText, version } from './common';

export const DUE_BEFORE_START_MESSAGE = 'Due date must be on or after the start date';

const dueOnOrAfterStart = (v: { startDate?: string; dueDate?: string }) =>
  !v.startDate || !v.dueDate || v.dueDate >= v.startDate;

export const ActionItemCreate = z
  .strictObject({
    description: requiredText(2000),
    assigneeId: z.string({ message: 'Required' }).min(1, { message: 'Required' }),
    startDate: dateString,
    dueDate: dateString,
    status: ActionItemStatus.optional(),
  })
  .refine(dueOnOrAfterStart, { message: DUE_BEFORE_START_MESSAGE, path: ['dueDate'] });
export type ActionItemCreate = z.infer<typeof ActionItemCreate>;

export const ActionItemUpdate = z
  .strictObject({
    version,
    description: requiredText(2000).optional(),
    assigneeId: z.string().min(1).optional(),
    startDate: dateString.optional(),
    dueDate: dateString.optional(),
    status: ActionItemStatus.optional(),
    confirmOpenIssues: z.boolean().optional(),
  })
  .refine(dueOnOrAfterStart, { message: DUE_BEFORE_START_MESSAGE, path: ['dueDate'] });
export type ActionItemUpdate = z.infer<typeof ActionItemUpdate>;
