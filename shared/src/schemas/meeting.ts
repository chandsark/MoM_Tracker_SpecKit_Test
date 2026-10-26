import { z } from 'zod';
import { dateString, requiredText, version } from './common';

/** Exactly one of a registered user or an external name ("1–100 chars"). */
export const ParticipantInput = z
  .strictObject({
    userId: z.string().min(1).optional(),
    externalName: requiredText(100).optional(),
  })
  .refine((p) => (p.userId === undefined) !== (p.externalName === undefined), {
    message: 'Choose a registered user or enter an external name',
  });
export type ParticipantInput = z.infer<typeof ParticipantInput>;

const participants = z
  .array(ParticipantInput)
  .min(1, { message: 'Add at least one participant' })
  .superRefine((list, ctx) => {
    const ids = list.flatMap((p) => (p.userId ? [p.userId] : []));
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', message: 'Each participant can be added only once' });
    }
  });

export const MeetingCreate = z.strictObject({
  description: requiredText(2000),
  meetingDate: dateString,
  participants,
});
export type MeetingCreate = z.infer<typeof MeetingCreate>;

export const MeetingUpdate = z.strictObject({
  version,
  description: requiredText(2000).optional(),
  meetingDate: dateString.optional(),
  participants: participants.optional(),
});
export type MeetingUpdate = z.infer<typeof MeetingUpdate>;
