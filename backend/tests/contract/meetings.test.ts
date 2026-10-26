import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, createUser, meetingScenario, prisma, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

describe('POST /api/meetings', () => {
  it('creates a meeting with the caller as organizer and records history', async () => {
    const olivia = await createUser({ name: 'Olivia' });
    const arjun = await createUser({ name: 'Arjun' });
    const client = await agentFor(olivia);
    const res = await client.post('/api/meetings', {
      description: '  Sprint planning  ',
      meetingDate: '2030-01-15', // future dates are allowed
      participants: [{ userId: arjun.id }, { externalName: 'Vendor Rep' }],
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      description: 'Sprint planning',
      meetingDate: '2030-01-15',
      organizer: { id: olivia.id, name: 'Olivia', active: true },
      participantCount: 2,
      actionItemCount: 0,
      openIssueCount: 0,
      version: 1,
      permissions: { canEdit: true, canDelete: true },
    });
    expect(res.body.participants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          user: { id: arjun.id, name: 'Arjun', active: true },
          externalName: null,
        }),
        expect.objectContaining({ user: null, externalName: 'Vendor Rep' }),
      ]),
    );
    const history = await prisma.changeHistory.findMany({ where: { entityId: res.body.id } });
    expect(history).toEqual([expect.objectContaining({ action: 'CREATE', actorId: olivia.id })]);
  });

  it.each([
    ['missing description', { meetingDate: '2026-10-01', participants: [{ externalName: 'A' }] }],
    [
      'blank description',
      { description: '   ', meetingDate: '2026-10-01', participants: [{ externalName: 'A' }] },
    ],
    [
      'description over 2000 chars',
      {
        description: 'x'.repeat(2001),
        meetingDate: '2026-10-01',
        participants: [{ externalName: 'A' }],
      },
    ],
    [
      'invalid date',
      { description: 'D', meetingDate: '2026-02-30', participants: [{ externalName: 'A' }] },
    ],
    ['no participants', { description: 'D', meetingDate: '2026-10-01', participants: [] }],
    [
      'participant with both userId and externalName',
      {
        description: 'D',
        meetingDate: '2026-10-01',
        participants: [{ userId: 'x', externalName: 'A' }],
      },
    ],
    [
      'participant with neither',
      { description: 'D', meetingDate: '2026-10-01', participants: [{}] },
    ],
    [
      'external name over 100 chars',
      {
        description: 'D',
        meetingDate: '2026-10-01',
        participants: [{ externalName: 'x'.repeat(101) }],
      },
    ],
    [
      'unknown field',
      {
        description: 'D',
        meetingDate: '2026-10-01',
        participants: [{ externalName: 'A' }],
        extra: 1,
      },
    ],
  ])('rejects %s with 400', async (_label, body) => {
    const client = await agentFor(await createUser());
    const res = await client.post('/api/meetings', body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects duplicate and unknown participant users', async () => {
    const me = await createUser();
    const other = await createUser();
    const client = await agentFor(me);
    const dup = await client.post('/api/meetings', {
      description: 'D',
      meetingDate: '2026-10-01',
      participants: [{ userId: other.id }, { userId: other.id }],
    });
    expect(dup.status).toBe(400);
    const unknown = await client.post('/api/meetings', {
      description: 'D',
      meetingDate: '2026-10-01',
      participants: [{ userId: 'does-not-exist' }],
    });
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.details.fields.participants).toBeDefined();
  });
});

describe('GET /api/meetings and /api/meetings/:id', () => {
  it('lists newest meeting date first with counts', async () => {
    const client = await agentFor(await createUser());
    for (const date of ['2026-01-01', '2026-03-01', '2026-02-01']) {
      await client.post('/api/meetings', {
        description: `Meeting ${date}`,
        meetingDate: date,
        participants: [{ externalName: 'A' }],
      });
    }
    const res = await client.get('/api/meetings');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.items.map((m: { meetingDate: string }) => m.meetingDate)).toEqual([
      '2026-03-01',
      '2026-02-01',
      '2026-01-01',
    ]);
    expect(res.body.items[0]).toMatchObject({
      participantCount: 1,
      actionItemCount: 0,
      openIssueCount: 0,
    });
  });

  it('returns detail with participants and permissions for a non-organizer', async () => {
    const { meeting, outsider } = await meetingScenario();
    const res = await (await agentFor(outsider)).get(`/api/meetings/${meeting.id}`);
    expect(res.status).toBe(200);
    expect(res.body.participants).toHaveLength(3);
    expect(res.body.permissions).toEqual({
      canEdit: false,
      canReassign: false,
      canComment: false,
      canRaiseIssue: false,
      canDelete: false,
    });
  });

  it('returns 404 for an unknown meeting', async () => {
    const client = await agentFor(await createUser());
    const res = await client.get('/api/meetings/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/meetings/:id', () => {
  it('lets the organizer update fields and records one history row per changed field', async () => {
    const { asOrganizer, meeting, organizer } = await meetingScenario();
    const res = await asOrganizer.patch(`/api/meetings/${meeting.id}`, {
      version: 1,
      description: 'Weekly sync (moved)',
      meetingDate: '2026-10-21',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      description: 'Weekly sync (moved)',
      meetingDate: '2026-10-21',
      version: 2,
    });
    const updates = await prisma.changeHistory.findMany({
      where: { entityId: meeting.id, action: 'UPDATE' },
      orderBy: { field: 'asc' },
    });
    expect(updates).toEqual([
      expect.objectContaining({
        field: 'description',
        oldValue: 'Weekly sync',
        newValue: 'Weekly sync (moved)',
        actorId: organizer.id,
      }),
      expect.objectContaining({
        field: 'meetingDate',
        oldValue: '2026-10-20',
        newValue: '2026-10-21',
      }),
    ]);
  });

  it('replaces participants', async () => {
    const { asOrganizer, meeting, outsider } = await meetingScenario();
    const res = await asOrganizer.patch(`/api/meetings/${meeting.id}`, {
      version: 1,
      participants: [{ userId: outsider.id }],
    });
    expect(res.status).toBe(200);
    expect(res.body.participantCount).toBe(1);
    expect(res.body.participants[0].user.id).toBe(outsider.id);
  });

  it('forbids anyone other than the organizer', async () => {
    const { meeting, assignee, participant } = await meetingScenario();
    for (const user of [assignee, participant]) {
      const res = await (
        await agentFor(user)
      ).patch(`/api/meetings/${meeting.id}`, {
        version: 1,
        description: 'Hijacked',
      });
      expect(res.status).toBe(403);
    }
  });

  it('returns 409 VERSION_CONFLICT with the current record for a stale version', async () => {
    const { asOrganizer, meeting } = await meetingScenario();
    await asOrganizer.patch(`/api/meetings/${meeting.id}`, { version: 1, description: 'First' });
    const res = await asOrganizer.patch(`/api/meetings/${meeting.id}`, {
      version: 1,
      description: 'Second',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('VERSION_CONFLICT');
    expect(res.body.error.details.current).toMatchObject({ description: 'First', version: 2 });
  });

  it('returns 404 for an unknown meeting', async () => {
    const client = await agentFor(await createUser());
    const res = await client.patch('/api/meetings/nope', { version: 1, description: 'x' });
    expect(res.status).toBe(404);
  });
});
