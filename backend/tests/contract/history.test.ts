import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, anonymous, createItem, meetingScenario, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

describe('GET /api/history/:entityType/:entityId', () => {
  it('returns action item history oldest first', async () => {
    const { asOrganizer, meeting, assignee, organizer } = await meetingScenario();
    const item = await createItem(asOrganizer, meeting.id, assignee.id);
    const asAssignee = await agentFor(assignee);
    await asAssignee.patch(`/api/action-items/${item.id}`, { version: 1, status: 'IN_PROGRESS' });
    await asAssignee.patch(`/api/action-items/${item.id}`, { version: 2, status: 'DONE' });

    const res = await asOrganizer.get(`/api/history/action-item/${item.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({
      action: 'CREATE',
      field: null,
      actor: { id: organizer.id, name: 'Olivia', active: true },
    });
    expect(res.body[1]).toMatchObject({
      action: 'UPDATE',
      field: 'status',
      oldValue: 'OPEN',
      newValue: 'IN_PROGRESS',
      actor: { id: assignee.id },
    });
    expect(res.body[2]).toMatchObject({ oldValue: 'IN_PROGRESS', newValue: 'DONE' });
    expect(new Date(res.body[0].createdAt).toString()).not.toBe('Invalid Date');
  });

  it('returns meeting history', async () => {
    const { asOrganizer, meeting } = await meetingScenario();
    await asOrganizer.patch(`/api/meetings/${meeting.id}`, { version: 1, description: 'Renamed' });
    const res = await asOrganizer.get(`/api/history/meeting/${meeting.id}`);
    expect(res.body.map((e: { action: string }) => e.action)).toEqual(['CREATE', 'UPDATE']);
  });

  it('rejects an unknown entity type with 400', async () => {
    const { asOrganizer } = await meetingScenario();
    const res = await asOrganizer.get('/api/history/widget/abc');
    expect(res.status).toBe(400);
  });

  it('requires a session', async () => {
    const res = await anonymous().get('/api/history/meeting/abc');
    expect(res.status).toBe(401);
  });
});
