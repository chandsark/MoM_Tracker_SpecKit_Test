import { beforeEach, describe, expect, it } from 'vitest';
import {
  agentFor,
  createIssue,
  createItem,
  meetingScenario,
  prisma,
  resetDb,
} from '../helpers/testApp';

beforeEach(resetDb);

async function setup() {
  const s = await meetingScenario();
  const item = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id);
  return {
    ...s,
    item,
    asAssignee: await agentFor(s.assignee),
    asParticipant: await agentFor(s.participant),
  };
}

describe('POST /api/action-items/:id/issues', () => {
  it('lets the assignee, organizer and registered participants raise issues', async () => {
    const { item, asAssignee, asOrganizer, asParticipant, participant } = await setup();
    for (const client of [asAssignee, asOrganizer]) {
      const res = await client.post(`/api/action-items/${item.id}/issues`, {
        title: 'Blocked',
        description: 'Waiting on data',
        severity: 'MEDIUM',
      });
      expect(res.status).toBe(201);
    }
    const res = await asParticipant.post(`/api/action-items/${item.id}/issues`, {
      title: 'Vendor delay',
      description: 'The vendor will be late',
      severity: 'HIGH',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Vendor delay',
      status: 'OPEN',
      severity: 'HIGH',
      version: 1,
      raisedBy: { id: participant.id },
      actionItem: { id: item.id },
    });
    const history = await prisma.changeHistory.findMany({ where: { entityId: res.body.id } });
    expect(history).toEqual([expect.objectContaining({ entityType: 'ISSUE', action: 'CREATE' })]);
  });

  it('forbids users who are not part of the meeting', async () => {
    const { item, outsider } = await setup();
    const res = await (
      await agentFor(outsider)
    ).post(`/api/action-items/${item.id}/issues`, {
      title: 'x',
      description: 'y',
      severity: 'LOW',
    });
    expect(res.status).toBe(403);
  });

  it.each([
    ['blank title', { title: ' ' }],
    ['title over 200 chars', { title: 'x'.repeat(201) }],
    ['blank description', { description: '' }],
    ['description over 2000 chars', { description: 'x'.repeat(2001) }],
    ['unknown severity', { severity: 'URGENT' }],
    ['missing severity', { severity: undefined }],
  ])('rejects %s with 400', async (_label, override) => {
    const { item, asAssignee } = await setup();
    const res = await asAssignee.post(`/api/action-items/${item.id}/issues`, {
      title: 'Title',
      description: 'Description',
      severity: 'LOW',
      ...override,
    });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/issues/:id', () => {
  it('lets the assignee and organizer update an issue, recording history per field', async () => {
    const { item, asAssignee, asOrganizer, assignee } = await setup();
    const issue = await createIssue(asAssignee, item.id);
    const res = await asAssignee.patch(`/api/issues/${issue.id}`, {
      version: 1,
      status: 'IN_PROGRESS',
      severity: 'CRITICAL',
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'IN_PROGRESS', severity: 'CRITICAL', version: 2 });
    const rows = await prisma.changeHistory.findMany({
      where: { entityId: issue.id, action: 'UPDATE' },
      orderBy: { field: 'asc' },
    });
    expect(rows).toEqual([
      expect.objectContaining({
        field: 'severity',
        oldValue: 'HIGH',
        newValue: 'CRITICAL',
        actorId: assignee.id,
      }),
      expect.objectContaining({ field: 'status', oldValue: 'OPEN', newValue: 'IN_PROGRESS' }),
    ]);
    const byOrganizer = await asOrganizer.patch(`/api/issues/${issue.id}`, {
      version: 2,
      status: 'RESOLVED',
    });
    expect(byOrganizer.status).toBe(200);
  });

  it('does not let the raising participant edit the issue after creation', async () => {
    const { item, asParticipant } = await setup();
    const issue = await createIssue(asParticipant, item.id);
    const res = await asParticipant.patch(`/api/issues/${issue.id}`, {
      version: 1,
      title: 'Changed',
    });
    expect(res.status).toBe(403);
  });

  it('allows OPEN → IN_PROGRESS → RESOLVED → OPEN but rejects RESOLVED → IN_PROGRESS', async () => {
    const { item, asAssignee } = await setup();
    const issue = await createIssue(asAssignee, item.id);
    expect(
      (await asAssignee.patch(`/api/issues/${issue.id}`, { version: 1, status: 'IN_PROGRESS' }))
        .status,
    ).toBe(200);
    expect(
      (await asAssignee.patch(`/api/issues/${issue.id}`, { version: 2, status: 'RESOLVED' }))
        .status,
    ).toBe(200);
    const bad = await asAssignee.patch(`/api/issues/${issue.id}`, {
      version: 3,
      status: 'IN_PROGRESS',
    });
    expect(bad.status).toBe(400);
    expect(
      (await asAssignee.patch(`/api/issues/${issue.id}`, { version: 3, status: 'OPEN' })).status,
    ).toBe(200);
  });

  it('returns 409 for a stale version', async () => {
    const { item, asAssignee, asOrganizer } = await setup();
    const issue = await createIssue(asAssignee, item.id);
    await asOrganizer.patch(`/api/issues/${issue.id}`, { version: 1, title: 'Renamed' });
    const res = await asAssignee.patch(`/api/issues/${issue.id}`, {
      version: 1,
      status: 'RESOLVED',
    });
    expect(res.status).toBe(409);
    expect(res.body.error.details.current).toMatchObject({ title: 'Renamed', version: 2 });
  });
});

describe('GET /api/issues/:id', () => {
  it('includes the parent action item and meeting and the caller permissions', async () => {
    const { item, asAssignee, meeting, outsider } = await setup();
    const issue = await createIssue(asAssignee, item.id);
    const res = await (await agentFor(outsider)).get(`/api/issues/${issue.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      actionItem: { id: item.id, description: 'Prepare report', assignee: { name: 'Arjun' } },
      meeting: { id: meeting.id, description: 'Weekly sync' },
      permissions: { canEdit: false, canDelete: false },
    });
  });

  it('returns 404 for an unknown issue', async () => {
    const { asAssignee } = await setup();
    expect((await asAssignee.get('/api/issues/nope')).status).toBe(404);
  });
});
