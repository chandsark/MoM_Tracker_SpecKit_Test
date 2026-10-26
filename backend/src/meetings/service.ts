import type {
  DeletionImpact,
  Meeting,
  MeetingCreate,
  MeetingFilters,
  MeetingSummary,
  MeetingUpdate,
  Page,
  ParticipantInput,
} from '@mom/shared';
import type { Prisma } from '@prisma/client';
import { actionItemOrder } from '../actionItems/service';
import { prisma } from '../db';
import { diffFields, writeHistory } from '../history';
import {
  StaleVersionError,
  loadMeeting,
  meetingContext,
  meetingInclude,
  openIssueWhere,
  type MeetingWithRels,
} from '../lib/context';
import { fieldError, forbidden, versionConflict } from '../lib/errors';
import { pageResult, toSkipTake } from '../lib/pagination';
import { userRef } from '../lib/serialize';
import { canDelete, canEditMeeting, meetingPermissions, type PolicyUser } from '../policy';
import { softDelete } from '../softDelete/service';

interface Counts {
  actionItems: Map<string, number>;
  openIssues: Map<string, number>;
}

async function countsFor(meetingIds: string[]): Promise<Counts> {
  const [items, issues] = await Promise.all([
    prisma.actionItem.groupBy({
      by: ['meetingId'],
      where: { meetingId: { in: meetingIds }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.issue.findMany({
      where: { ...openIssueWhere, actionItem: { meetingId: { in: meetingIds }, deletedAt: null } },
      select: { actionItem: { select: { meetingId: true } } },
    }),
  ]);
  const openIssues = new Map<string, number>();
  for (const i of issues) {
    openIssues.set(i.actionItem.meetingId, (openIssues.get(i.actionItem.meetingId) ?? 0) + 1);
  }
  return {
    actionItems: new Map(items.map((g) => [g.meetingId, g._count._all])),
    openIssues,
  };
}

function participantLabels(m: MeetingWithRels): string[] {
  return m.participants
    .map((p) => (p.user ? `${p.user.name} (${p.user.id})` : (p.externalName ?? '')))
    .sort();
}

function serializeSummary(m: MeetingWithRels, counts: Counts): MeetingSummary {
  return {
    id: m.id,
    description: m.description,
    meetingDate: m.meetingDate,
    organizer: userRef(m.organizer),
    participantCount: m.participants.length,
    actionItemCount: counts.actionItems.get(m.id) ?? 0,
    openIssueCount: counts.openIssues.get(m.id) ?? 0,
  };
}

function serializeMeeting(user: PolicyUser, m: MeetingWithRels, counts: Counts): Meeting {
  return {
    ...serializeSummary(m, counts),
    version: m.version,
    participants: m.participants.map((p) => ({
      id: p.id,
      user: p.user ? userRef(p.user) : null,
      externalName: p.externalName,
    })),
    permissions: meetingPermissions(user, meetingContext(m)),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export async function getMeeting(user: PolicyUser, id: string): Promise<Meeting> {
  const m = await loadMeeting(id);
  return serializeMeeting(user, m, await countsFor([m.id]));
}

export function buildMeetingWhere(
  f: Omit<MeetingFilters, 'page' | 'pageSize'>,
): Prisma.MeetingWhereInput {
  return {
    deletedAt: null,
    ...(f.from || f.to
      ? { meetingDate: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } }
      : {}),
    ...(f.participantId ? { participants: { some: { userId: f.participantId } } } : {}),
    ...(f.q ? { description: { contains: f.q } } : {}),
  };
}

export async function listMeetings(filters: MeetingFilters): Promise<Page<MeetingSummary>> {
  const where = buildMeetingWhere(filters);
  const [meetings, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      include: meetingInclude,
      orderBy: [{ meetingDate: 'desc' }, { createdAt: 'desc' }],
      ...toSkipTake(filters),
    }),
    prisma.meeting.count({ where }),
  ]);
  const counts = await countsFor(meetings.map((m) => m.id));
  return pageResult(
    meetings.map((m) => serializeSummary(m, counts)),
    total,
  );
}

/** Organizer-only soft delete of the meeting with all its action items and issues. */
export async function deleteMeeting(user: PolicyUser, id: string, version: number): Promise<void> {
  const m = await loadMeeting(id);
  if (!canDelete(user, meetingContext(m))) throw forbidden();
  if (version !== m.version) throw versionConflict(await getMeeting(user, id));
  try {
    await prisma.$transaction((tx) => softDelete(tx, 'MEETING', id, version, user));
  } catch (err) {
    if (err instanceof StaleVersionError) throw versionConflict(await getMeeting(user, id));
    throw err;
  }
}

/** What deleting the meeting would also delete, for the confirmation dialog. */
export async function deletionImpact(id: string): Promise<DeletionImpact> {
  await loadMeeting(id);
  const items = await prisma.actionItem.findMany({
    where: { meetingId: id, deletedAt: null },
    orderBy: actionItemOrder,
    select: {
      id: true,
      description: true,
      issues: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        select: { id: true, title: true },
      },
    },
  });
  return {
    actionItemCount: items.length,
    issueCount: items.reduce((n, i) => n + i.issues.length, 0),
    actionItems: items.map((i) => ({
      id: i.id,
      description: i.description,
      issueCount: i.issues.length,
      issues: i.issues,
    })),
  };
}

/** Validates registered participants and returns them keyed by id (for history labels). */
async function participantUsers(list: ParticipantInput[] | undefined) {
  const ids = list?.flatMap((p) => (p.userId ? [p.userId] : [])) ?? [];
  if (ids.length === 0) return new Map<string, { id: string; name: string }>();
  const users = await prisma.user.findMany({
    where: { id: { in: ids }, deactivatedAt: null },
    select: { id: true, name: true },
  });
  if (users.length !== ids.length) {
    throw fieldError('participants', 'Each registered participant must be an active user.');
  }
  return new Map(users.map((u) => [u.id, u]));
}

function participantRows(list: ParticipantInput[]) {
  return list.map((p) => (p.userId ? { userId: p.userId } : { externalName: p.externalName! }));
}

export async function createMeeting(user: PolicyUser, input: MeetingCreate): Promise<Meeting> {
  await participantUsers(input.participants);
  const meeting = await prisma.$transaction(async (tx) => {
    const created = await tx.meeting.create({
      data: {
        description: input.description,
        meetingDate: input.meetingDate,
        organizerId: user.id,
        participants: { create: participantRows(input.participants) },
      },
    });
    await writeHistory(tx, {
      entityType: 'MEETING',
      entityId: created.id,
      action: 'CREATE',
      actorId: user.id,
    });
    return created;
  });
  return getMeeting(user, meeting.id);
}

export async function updateMeeting(
  user: PolicyUser,
  id: string,
  input: MeetingUpdate,
): Promise<Meeting> {
  const before = await loadMeeting(id);
  if (!canEditMeeting(user, meetingContext(before))) throw forbidden();
  if (input.version !== before.version) throw versionConflict(await getMeeting(user, id));
  const users = await participantUsers(input.participants);

  const afterParticipants = input.participants
    ?.map((p) => (p.userId ? `${users.get(p.userId)!.name} (${p.userId})` : p.externalName!))
    .sort();

  try {
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.meeting.updateMany({
        where: { id, version: input.version, deletedAt: null },
        data: {
          description: input.description,
          meetingDate: input.meetingDate,
          version: { increment: 1 },
        },
      });
      if (count === 0) throw new StaleVersionError();
      if (input.participants) {
        await tx.meetingParticipant.deleteMany({ where: { meetingId: id } });
        await tx.meetingParticipant.createMany({
          data: participantRows(input.participants).map((r) => ({ ...r, meetingId: id })),
        });
      }
      const changes = diffFields(
        {
          description: before.description,
          meetingDate: before.meetingDate,
          participants: participantLabels(before),
        },
        {
          description: input.description,
          meetingDate: input.meetingDate,
          participants: afterParticipants,
        },
        ['description', 'meetingDate', 'participants'],
      );
      await writeHistory(tx, {
        entityType: 'MEETING',
        entityId: id,
        action: 'UPDATE',
        actorId: user.id,
        changes,
      });
    });
  } catch (err) {
    if (err instanceof StaleVersionError) throw versionConflict(await getMeeting(user, id));
    throw err;
  }
  return getMeeting(user, id);
}
