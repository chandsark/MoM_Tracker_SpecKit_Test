import { beforeEach, describe, expect, it } from 'vitest';
import {
  agentFor,
  createItem,
  createUser,
  meetingScenario,
  prisma,
  resetDb,
} from '../helpers/testApp';

beforeEach(resetDb);

async function setup() {
  const s = await meetingScenario();
  const item = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
    startDate: '2026-10-20',
    dueDate: '2026-10-30',
  });
  return { ...s, item, asAssignee: await agentFor(s.assignee) };
}

describe('PATCH /api/action-items/:id — progress updates', () => {
  it.each(['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'])(
    'lets the assignee set status %s',
    async (status) => {
      const { asAssignee, item } = await setup();
      const res = await asAssignee.patch(`/api/action-items/${item.id}`, { version: 1, status });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status, version: 2 });
    },
  );

  it('lets the organizer change dates', async () => {
    const { asOrganizer, item } = await setup();
    const res = await asOrganizer.patch(`/api/action-items/${item.id}`, {
      version: 1,
      startDate: '2026-10-21',
      dueDate: '2026-11-15',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ startDate: '2026-10-21', dueDate: '2026-11-15' });
  });

  it('forbids participants and other users from changing status or dates', async () => {
    const { participant, outsider, item } = await setup();
    for (const user of [participant, outsider]) {
      const client = await agentFor(user);
      const res = await client.patch(`/api/action-items/${item.id}`, {
        version: 1,
        status: 'DONE',
      });
      expect(res.status).toBe(403);
    }
  });

  it('records one history row per changed field with old value, new value and actor', async () => {
    const { asAssignee, assignee, item } = await setup();
    await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      status: 'IN_PROGRESS',
      dueDate: '2026-11-05',
      startDate: '2026-10-20', // unchanged → no row
    });
    const rows = await prisma.changeHistory.findMany({
      where: { entityId: item.id, action: 'UPDATE' },
      orderBy: { field: 'asc' },
    });
    expect(rows).toEqual([
      expect.objectContaining({
        field: 'dueDate',
        oldValue: '2026-10-30',
        newValue: '2026-11-05',
        actorId: assignee.id,
      }),
      expect.objectContaining({
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
        actorId: assignee.id,
      }),
    ]);
  });

  it('validates date order against the stored value on partial updates', async () => {
    const { asAssignee, item } = await setup();
    const res = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      dueDate: '2026-10-19',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.dueDate).toBeDefined();
    const res2 = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      startDate: '2026-10-31',
    });
    expect(res2.status).toBe(400);
  });

  it('allows reopening DONE or CANCELLED items to OPEN or IN_PROGRESS', async () => {
    const { asAssignee, item } = await setup();
    await asAssignee.patch(`/api/action-items/${item.id}`, { version: 1, status: 'DONE' });
    const reopened = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 2,
      status: 'IN_PROGRESS',
    });
    expect(reopened.status).toBe(200);
    await asAssignee.patch(`/api/action-items/${item.id}`, { version: 3, status: 'CANCELLED' });
    const reopened2 = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 4,
      status: 'OPEN',
    });
    expect(reopened2.status).toBe(200);
  });

  it('rejects moving a DONE item straight to BLOCKED (reopen first)', async () => {
    const { asAssignee, item } = await setup();
    await asAssignee.patch(`/api/action-items/${item.id}`, { version: 1, status: 'DONE' });
    const res = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 2,
      status: 'BLOCKED',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 VERSION_CONFLICT with the current record for a stale version', async () => {
    const { asAssignee, asOrganizer, item } = await setup();
    await asOrganizer.patch(`/api/action-items/${item.id}`, { version: 1, dueDate: '2026-11-01' });
    const res = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      status: 'DONE',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VERSION_CONFLICT');
    expect(res.body.error.details.current).toMatchObject({
      dueDate: '2026-11-01',
      version: 2,
      status: 'OPEN',
    });
  });
});

describe('PATCH /api/action-items/:id — organizer-only fields', () => {
  it('forbids the assignee from reassigning', async () => {
    const { asAssignee, participant, item } = await setup();
    const res = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      assigneeId: participant.id,
    });
    expect(res.status).toBe(403);
  });

  it('lets the organizer reassign; rights move to the new assignee immediately', async () => {
    const { asOrganizer, asAssignee, participant, item } = await setup();
    const res = await asOrganizer.patch(`/api/action-items/${item.id}`, {
      version: 1,
      assigneeId: participant.id,
    });
    expect(res.status).toBe(200);
    expect(res.body.assignee.id).toBe(participant.id);

    const newAssignee = await agentFor(participant);
    const ok = await newAssignee.patch(`/api/action-items/${item.id}`, {
      version: 2,
      status: 'IN_PROGRESS',
    });
    expect(ok.status).toBe(200);
    const denied = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 3,
      status: 'DONE',
    });
    expect(denied.status).toBe(403);

    const history = await prisma.changeHistory.findFirst({
      where: { entityId: item.id, field: 'assignee' },
    });
    expect(history).toMatchObject({
      oldValue: expect.stringContaining('Arjun'),
      newValue: expect.stringContaining('Mei'),
    });
  });

  it('rejects reassignment to an inactive user', async () => {
    const { asOrganizer, item } = await setup();
    const gone = await createUser({ deactivated: true });
    const res = await asOrganizer.patch(`/api/action-items/${item.id}`, {
      version: 1,
      assigneeId: gone.id,
    });
    expect(res.status).toBe(400);
  });

  it('only lets the organizer change the description', async () => {
    const { asAssignee, asOrganizer, item } = await setup();
    const denied = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      description: 'Changed',
    });
    expect(denied.status).toBe(403);
    const ok = await asOrganizer.patch(`/api/action-items/${item.id}`, {
      version: 1,
      description: 'Changed',
    });
    expect(ok.status).toBe(200);
    expect(ok.body.description).toBe('Changed');
  });
});

describe('needs reassignment', () => {
  it('flags open items whose assignee was deactivated', async () => {
    const { asOrganizer, assignee, item } = await setup();
    await prisma.user.update({ where: { id: assignee.id }, data: { deactivatedAt: new Date() } });
    const res = await asOrganizer.get(`/api/action-items/${item.id}`);
    expect(res.body.needsReassignment).toBe(true);
    expect(res.body.assignee.active).toBe(false);
  });
});
