// FR-025 / FR-028: confirmed soft delete with batch cascade and restore, invisible everywhere else.
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

async function seed() {
  const s = await meetingScenario();
  const asAssignee = await agentFor(s.assignee);
  const itemA = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
    description: 'Item A',
  });
  const itemB = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
    description: 'Item B',
  });
  const issueA1 = await createIssue(asAssignee, itemA.id, { title: 'Issue A1' });
  const issueA2 = await createIssue(asAssignee, itemA.id, { title: 'Issue A2' });
  const issueB1 = await createIssue(asAssignee, itemB.id, { title: 'Issue B1' });
  return { ...s, asAssignee, itemA, itemB, issueA1, issueA2, issueB1 };
}

const batchOf = {
  meeting: async (id: string) =>
    (await prisma.meeting.findUniqueOrThrow({ where: { id } })).deletionBatchId,
  item: async (id: string) =>
    (await prisma.actionItem.findUniqueOrThrow({ where: { id } })).deletionBatchId,
  issue: async (id: string) =>
    (await prisma.issue.findUniqueOrThrow({ where: { id } })).deletionBatchId,
};

describe('DELETE /api/meetings/:id', () => {
  it('soft-deletes the meeting, its action items and issues with one shared batch id', async () => {
    const s = await seed();
    const res = await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}?version=1`);
    expect(res.status).toBe(204);

    const batch = await batchOf.meeting(s.meeting.id);
    expect(batch).toBeTruthy();
    for (const id of [s.itemA.id, s.itemB.id]) expect(await batchOf.item(id)).toBe(batch);
    for (const id of [s.issueA1.id, s.issueA2.id, s.issueB1.id])
      expect(await batchOf.issue(id)).toBe(batch);
    const meeting = await prisma.meeting.findUniqueOrThrow({ where: { id: s.meeting.id } });
    expect(meeting.deletedAt).not.toBeNull();
    expect(meeting.deletedById).toBe(s.organizer.id);
  });

  it('is organizer-only, requires the current version, and rejects a missing version', async () => {
    const s = await seed();
    expect((await s.asAssignee.delete(`/api/meetings/${s.meeting.id}?version=1`)).status).toBe(403);
    const stale = await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}?version=9`);
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe('VERSION_CONFLICT');
    expect(stale.body.error.details.current.id).toBe(s.meeting.id);
    expect((await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}`)).status).toBe(400);
    expect(await batchOf.meeting(s.meeting.id)).toBeNull();
  });

  it('hides deleted records from every list, detail, traceability view, and export', async () => {
    const s = await seed();
    await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}?version=1`);
    const c = s.asOrganizer;

    expect((await c.get('/api/meetings')).body.total).toBe(0);
    expect((await c.get('/api/action-items')).body.total).toBe(0);
    expect((await c.get('/api/issues')).body.total).toBe(0);
    expect((await c.get(`/api/meetings/${s.meeting.id}`)).status).toBe(404);
    expect((await c.get(`/api/meetings/${s.meeting.id}/traceability`)).status).toBe(404);
    expect((await c.get(`/api/action-items/${s.itemA.id}`)).status).toBe(404);
    expect((await c.get(`/api/issues/${s.issueA1.id}`)).status).toBe(404);
    for (const url of ['/api/action-items/export.csv', '/api/issues/export.csv']) {
      const lines = (await c.get(url)).text.split('\r\n').filter(Boolean);
      expect(lines).toHaveLength(1); // header only
    }
  });

  it('records DELETE and RESTORE history for every affected record', async () => {
    const s = await seed();
    await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}?version=1`);
    await s.asOrganizer.post(`/api/deleted/meeting/${s.meeting.id}/restore`);
    for (const [type, id] of [
      ['meeting', s.meeting.id],
      ['action-item', s.itemA.id],
      ['issue', s.issueB1.id],
    ] as const) {
      const history = (await s.asOrganizer.get(`/api/history/${type}/${id}`)).body as {
        action: string;
      }[];
      expect(history.map((h) => h.action).slice(-2)).toEqual(['DELETE', 'RESTORE']);
    }
  });
});

describe('DELETE /api/action-items/:id and /api/issues/:id', () => {
  it('cascades an action item delete to its issues only', async () => {
    const s = await seed();
    expect((await s.asOrganizer.delete(`/api/action-items/${s.itemA.id}?version=1`)).status).toBe(
      204,
    );
    const batch = await batchOf.item(s.itemA.id);
    expect(batch).toBeTruthy();
    expect(await batchOf.issue(s.issueA1.id)).toBe(batch);
    expect(await batchOf.issue(s.issueA2.id)).toBe(batch);
    expect(await batchOf.issue(s.issueB1.id)).toBeNull();
    expect(await batchOf.meeting(s.meeting.id)).toBeNull();
    const trace = await s.asOrganizer.get(`/api/meetings/${s.meeting.id}/traceability`);
    expect(trace.body.actionItems.map((i: { description: string }) => i.description)).toEqual([
      'Item B',
    ]);
  });

  it('lets only the organizer delete an issue', async () => {
    const s = await seed();
    expect((await s.asAssignee.delete(`/api/issues/${s.issueB1.id}?version=1`)).status).toBe(403);
    expect((await s.asOrganizer.delete(`/api/issues/${s.issueB1.id}?version=1`)).status).toBe(204);
    expect((await s.asOrganizer.get(`/api/issues/${s.issueB1.id}`)).status).toBe(404);
    expect((await s.asOrganizer.get(`/api/action-items/${s.itemB.id}`)).body.openIssueCount).toBe(
      0,
    );
  });

  it('keeps an issue deleted on its own deleted when its meeting batch is restored', async () => {
    const s = await seed();
    await s.asOrganizer.delete(`/api/issues/${s.issueA1.id}?version=1`);
    await s.asOrganizer.delete(`/api/meetings/${s.meeting.id}?version=1`);
    const restore = await s.asOrganizer.post(`/api/deleted/meeting/${s.meeting.id}/restore`);
    expect(restore.status).toBe(204);
    expect((await s.asOrganizer.get(`/api/issues/${s.issueA2.id}`)).status).toBe(200);
    expect((await s.asOrganizer.get(`/api/issues/${s.issueA1.id}`)).status).toBe(404);
  });
});

describe('GET /api/meetings/:id/deletion-impact', () => {
  it('counts and names the non-deleted action items and issues a delete would affect', async () => {
    const s = await seed();
    await s.asOrganizer.delete(`/api/issues/${s.issueA2.id}?version=1`);
    const res = await s.asOrganizer.get(`/api/meetings/${s.meeting.id}/deletion-impact`);
    expect(res.status).toBe(200);
    expect(res.body.actionItemCount).toBe(2);
    expect(res.body.issueCount).toBe(2);
    expect(res.body.actionItems).toEqual(
      expect.arrayContaining([
        {
          id: s.itemA.id,
          description: 'Item A',
          issueCount: 1,
          issues: [{ id: s.issueA1.id, title: 'Issue A1' }],
        },
        {
          id: s.itemB.id,
          description: 'Item B',
          issueCount: 1,
          issues: [{ id: s.issueB1.id, title: 'Issue B1' }],
        },
      ]),
    );
  });
});
