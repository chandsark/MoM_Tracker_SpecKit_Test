// Loaders for a record plus the meeting context the authorization policy needs.
import type { Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { MeetingContext } from '../policy';
import { notFound } from './errors';

export const openIssueWhere = { deletedAt: null, status: { not: 'RESOLVED' } } as const;

export const meetingInclude = {
  organizer: true,
  participants: { include: { user: true } },
} satisfies Prisma.MeetingInclude;
export type MeetingWithRels = Prisma.MeetingGetPayload<{ include: typeof meetingInclude }>;

export function meetingContext(m: {
  organizerId: string;
  participants: { userId: string | null }[];
}): MeetingContext {
  return {
    organizerId: m.organizerId,
    participantUserIds: m.participants.flatMap((p) => (p.userId ? [p.userId] : [])),
  };
}

export async function loadMeeting(id: string): Promise<MeetingWithRels> {
  const meeting = await prisma.meeting.findFirst({
    where: { id, deletedAt: null },
    include: meetingInclude,
  });
  if (!meeting) throw notFound('Meeting not found.');
  return meeting;
}

export const itemInclude = {
  assignee: true,
  meeting: { include: { participants: { select: { userId: true } } } },
  _count: { select: { issues: { where: openIssueWhere } } },
} satisfies Prisma.ActionItemInclude;
export type ItemWithRels = Prisma.ActionItemGetPayload<{ include: typeof itemInclude }>;

/** A visible action item: neither it nor its meeting is soft-deleted. */
export async function loadActionItem(id: string): Promise<ItemWithRels> {
  const item = await prisma.actionItem.findFirst({
    where: { id, deletedAt: null, meeting: { deletedAt: null } },
    include: itemInclude,
  });
  if (!item) throw notFound('Action item not found.');
  return item;
}

/** Signals a lost optimistic-lock race inside a transaction. */
export class StaleVersionError extends Error {}
