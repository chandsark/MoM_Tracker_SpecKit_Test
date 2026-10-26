// Demo data for local development and end-to-end tests.
//   npm run db:seed                  → demo users, two meetings, items and an issue (idempotent)
//   npm run db:seed -- --volume=10000 → additionally bulk-insert N action items for performance checks
import { ACTION_ITEM_STATUSES, SEVERITY_RANK } from '@mom/shared';
import bcrypt from 'bcryptjs';
import '../src/config';
import { prisma } from '../src/db';

const PASSWORD = 'Password123!';

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function upsertUser(name: string, email: string, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash },
  });
}

async function seedBase() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const olivia = await upsertUser('Olivia Organizer', 'olivia@example.com', passwordHash);
  const arjun = await upsertUser('Arjun Assignee', 'arjun@example.com', passwordHash);
  const mei = await upsertUser('Mei Participant', 'mei@example.com', passwordHash);
  await upsertUser('Sam Outsider', 'sam@example.com', passwordHash);

  if ((await prisma.meeting.count({ where: { organizerId: olivia.id } })) > 0) {
    console.log('Base seed already present; skipping meetings.');
    return { olivia, arjun, mei };
  }

  const participants = {
    create: [{ userId: arjun.id }, { userId: mei.id }, { externalName: 'Vendor Rep' }],
  };
  const planning = await prisma.meeting.create({
    data: {
      description: 'Q4 planning kickoff',
      meetingDate: isoDate(-14),
      organizerId: olivia.id,
      participants,
    },
  });
  const review = await prisma.meeting.create({
    data: {
      description: 'Weekly delivery review',
      meetingDate: isoDate(-2),
      organizerId: olivia.id,
      participants,
    },
  });

  const items = [
    {
      meetingId: planning.id,
      description: 'Draft the Q4 roadmap',
      start: -14,
      due: -3,
      status: 'IN_PROGRESS',
    },
    {
      meetingId: planning.id,
      description: 'Collect budget estimates',
      start: -14,
      due: 7,
      status: 'OPEN',
    },
    {
      meetingId: review.id,
      description: 'Fix the release checklist',
      start: -2,
      due: 5,
      status: 'BLOCKED',
    },
    {
      meetingId: review.id,
      description: 'Share demo recording',
      start: -2,
      due: -1,
      status: 'DONE',
    },
  ];
  for (const it of items) {
    const created = await prisma.actionItem.create({
      data: {
        meetingId: it.meetingId,
        description: it.description,
        assigneeId: arjun.id,
        createdById: olivia.id,
        startDate: isoDate(it.start),
        dueDate: isoDate(it.due),
        status: it.status,
      },
    });
    await prisma.changeHistory.create({
      data: {
        entityType: 'ACTION_ITEM',
        entityId: created.id,
        action: 'CREATE',
        actorId: olivia.id,
      },
    });
    if (it.status === 'BLOCKED') {
      await prisma.issue.create({
        data: {
          actionItemId: created.id,
          title: 'Waiting on QA sign-off',
          description: 'QA environment is down until the infrastructure team restores it.',
          severity: 'HIGH',
          severityRank: SEVERITY_RANK.HIGH,
          raisedById: mei.id,
        },
      });
    }
  }
  for (const m of [planning, review]) {
    await prisma.changeHistory.create({
      data: { entityType: 'MEETING', entityId: m.id, action: 'CREATE', actorId: olivia.id },
    });
  }
  console.log('Seeded demo users, 2 meetings, 4 action items, 1 issue.');
  return { olivia, arjun, mei };
}

async function seedVolume(count: number, users: Awaited<ReturnType<typeof seedBase>>) {
  const meetingCount = 200;
  const meetingIds: string[] = [];
  for (let i = 0; i < meetingCount; i += 1) {
    const m = await prisma.meeting.create({
      data: {
        description: `Volume meeting ${i + 1}`,
        meetingDate: isoDate(-(i % 120)),
        organizerId: users.olivia.id,
        participants: { create: [{ userId: users.arjun.id }, { userId: users.mei.id }] },
      },
    });
    meetingIds.push(m.id);
  }
  const assignees = [users.arjun.id, users.mei.id, users.olivia.id];
  const batch = 1000;
  for (let start = 0; start < count; start += batch) {
    const data = [];
    for (let i = start; i < Math.min(start + batch, count); i += 1) {
      const startOffset = -((i * 7) % 90);
      data.push({
        meetingId: meetingIds[i % meetingCount]!,
        description: `Volume action item ${i + 1}`,
        assigneeId: assignees[i % assignees.length]!,
        createdById: users.olivia.id,
        startDate: isoDate(startOffset),
        dueDate: isoDate(startOffset + ((i * 13) % 60)),
        status: ACTION_ITEM_STATUSES[i % ACTION_ITEM_STATUSES.length]!,
      });
    }
    await prisma.actionItem.createMany({ data });
  }
  console.log(`Seeded ${count} additional action items across ${meetingCount} meetings.`);
}

async function main() {
  const volumeArg = process.argv.find((a) => a.startsWith('--volume='));
  const volume = volumeArg ? Number(volumeArg.split('=')[1]) : 0;
  const users = await seedBase();
  if (volume > 0) await seedVolume(volume, users);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
