import { beforeEach, describe, expect, it } from 'vitest';
import {
  agentFor,
  createIssue,
  createItem,
  createUser,
  meetingScenario,
  resetDb,
} from '../helpers/testApp';

beforeEach(resetDb);

async function seed() {
  const s = await meetingScenario();
  const asAssignee = await agentFor(s.assignee);
  const itemA = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
    description: 'Item A',
  });
  const itemB = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
    description: 'Item B',
  });
  await createIssue(asAssignee, itemB.id, { title: 'Issue B1' });
  return { ...s, asAssignee, itemA, itemB };
}

interface DeletedRecord {
  entityType: string;
  id: string;
  label: string;
  deletedBy: { name: string } | null;
  deletionBatchId: string;
  dependentCount: number;
}

describe('GET /api/deleted', () => {
  it('lists one entry per deletion batch, only for meetings the caller organizes', async () => {
    const s = await seed();
    // Someone else's deleted meeting must not show up.
    const other = await createUser({ name: 'Other organizer' });
    const asOther = await agentFor(other);
    const theirs = await asOther.post('/api/meetings', {
      description: 'Their meeting',
      meetingDate: '2026-10-20',
      participants: [{ externalName: 'X' }],
    });
    await asOther.delete(`/api/meetings/${theirs.body.id}?version=1`);

    await s.asOrganizer.delete(`/api/action-items/${s.itemA.id}?version=1`);
    await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}?version=1`);

    const res = await s.asOrganizer.get('/api/deleted');
    expect(res.status).toBe(200);
    const records = res.body as DeletedRecord[];
    expect(records.map((r) => [r.entityType, r.label, r.dependentCount])).toEqual([
      ['meeting', 'Weekly sync', 2], // Item B + Issue B1; Item A was deleted earlier on its own
      ['action-item', 'Item A', 0],
    ]);
    expect(records[0]!.deletedBy?.name).toBe('Olivia');
    expect(new Set(records.map((r) => r.deletionBatchId)).size).toBe(2);

    expect(((await s.asAssignee.get('/api/deleted')).body as unknown[]).length).toBe(0);
  });
});

describe('POST /api/deleted/:entityType/:id/restore', () => {
  it('restores the whole batch for the organizer', async () => {
    const s = await seed();
    await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}?version=1`);
    const res = await s.asOrganizer.post(`/api/deleted/meeting/${s.meeting.id}/restore`);
    expect(res.status).toBe(204);
    expect((await s.asOrganizer.get(`/api/meetings/${s.meeting.id}`)).status).toBe(200);
    expect((await s.asOrganizer.get('/api/action-items')).body.total).toBe(2);
    expect((await s.asOrganizer.get('/api/issues')).body.total).toBe(1);
    expect((await s.asOrganizer.get('/api/deleted')).body).toEqual([]);
  });

  it('is forbidden for anyone but the organizer', async () => {
    const s = await seed();
    await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}?version=1`);
    const res = await s.asAssignee.post(`/api/deleted/meeting/${s.meeting.id}/restore`);
    expect(res.status).toBe(403);
  });

  it('rejects restoring a child whose parent is still deleted with PARENT_DELETED', async () => {
    const s = await seed();
    await s.asOrganizer.delete(`/api/action-items/${s.itemA.id}?version=1`);
    await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}?version=1`);

    const blocked = await s.asOrganizer.post(`/api/deleted/action-item/${s.itemA.id}/restore`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('PARENT_DELETED');

    expect((await s.asOrganizer.post(`/api/deleted/meeting/${s.meeting.id}/restore`)).status).toBe(
      204,
    );
    expect((await s.asOrganizer.get(`/api/action-items/${s.itemA.id}`)).status).toBe(404); // separate batch
    expect(
      (await s.asOrganizer.post(`/api/deleted/action-item/${s.itemA.id}/restore`)).status,
    ).toBe(204);
    expect((await s.asOrganizer.get(`/api/action-items/${s.itemA.id}`)).status).toBe(200);
  });

  it('returns 400 for an unknown type and 404 for a record that is not deleted', async () => {
    const s = await seed();
    expect((await s.asOrganizer.post(`/api/deleted/task/${s.itemA.id}/restore`)).status).toBe(400);
    expect(
      (await s.asOrganizer.post(`/api/deleted/action-item/${s.itemA.id}/restore`)).status,
    ).toBe(404);
  });
});
