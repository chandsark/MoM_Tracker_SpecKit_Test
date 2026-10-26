import { beforeEach, describe, expect, it } from 'vitest';
import {
  agentFor,
  anonymous,
  createIssue,
  createItem,
  meetingScenario,
  prisma,
  resetDb,
} from '../helpers/testApp';

beforeEach(resetDb);

const TODAY = '2026-10-26';

async function seed() {
  const s = await meetingScenario();
  const asAssignee = await agentFor(s.assignee);
  const mk = (description: string, dueDate: string) =>
    createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
      description,
      startDate: '2026-09-01',
      dueDate,
    });
  const late = await mk('Late item', '2026-10-01'); // overdue
  const blocked = await mk('Blocked item', '2026-11-10');
  const done = await mk('Done item', '2026-10-02'); // past due but done → not overdue
  const removed = await mk('Removed item', '2026-11-20');
  await asAssignee.patch(`/api/action-items/${blocked.id}`, { version: 1, status: 'BLOCKED' });
  await asAssignee.patch(`/api/action-items/${done.id}`, { version: 1, status: 'DONE' });

  const open = await createIssue(asAssignee, blocked.id, { title: 'Open issue', severity: 'HIGH' });
  const resolved = await createIssue(asAssignee, blocked.id, {
    title: 'Resolved issue',
    severity: 'LOW',
  });
  await asAssignee.patch(`/api/issues/${resolved.id}`, { version: 1, status: 'RESOLVED' });
  const hidden = await createIssue(asAssignee, late.id, {
    title: 'Deleted issue',
    severity: 'LOW',
  });
  await createIssue(asAssignee, removed.id, { title: 'Issue on removed item' });

  // Soft-deleted records must not appear anywhere in the tree or the counts.
  const now = new Date();
  await prisma.issue.update({ where: { id: hidden.id }, data: { deletedAt: now } });
  await prisma.actionItem.update({ where: { id: removed.id }, data: { deletedAt: now } });

  // An item in another meeting must not leak in.
  const other = await s.asOrganizer.post('/api/meetings', {
    description: 'Other',
    meetingDate: '2026-10-21',
    participants: [{ externalName: 'X' }],
  });
  await createItem(s.asOrganizer, other.body.id, s.assignee.id, { description: 'Elsewhere' });

  return { ...s, ids: { late, blocked, done, open } };
}

describe('GET /api/meetings/:id/traceability', () => {
  it('returns the meeting and every non-deleted action item with its non-deleted issues', async () => {
    const { asOrganizer, meeting, assignee, ids } = await seed();
    const res = await asOrganizer.get(`/api/meetings/${meeting.id}/traceability?today=${TODAY}`);
    expect(res.status).toBe(200);
    expect(res.body.meeting).toMatchObject({ id: meeting.id, description: 'Weekly sync' });
    expect(res.body.meeting.permissions.canEdit).toBe(true);

    const items = res.body.actionItems as {
      id: string;
      description: string;
      status: string;
      dueDate: string;
      isOverdue: boolean;
      assignee: { id: string };
      issues: { title: string; status: string }[];
    }[];
    expect(items.map((i) => i.description)).toEqual(['Late item', 'Done item', 'Blocked item']);
    const late = items.find((i) => i.id === ids.late.id)!;
    expect(late).toMatchObject({
      status: 'OPEN',
      dueDate: '2026-10-01',
      isOverdue: true,
      assignee: { id: assignee.id },
    });
    expect(late.issues).toEqual([]);
    expect(items.find((i) => i.id === ids.done.id)!.isOverdue).toBe(false);
    const blocked = items.find((i) => i.id === ids.blocked.id)!;
    expect(blocked.issues.map((i) => [i.title, i.status])).toEqual([
      ['Open issue', 'OPEN'],
      ['Resolved issue', 'RESOLVED'],
    ]);
  });

  it('summarises counts by status, overdue items, and open issues', async () => {
    const { asOrganizer, meeting } = await seed();
    const res = await asOrganizer.get(`/api/meetings/${meeting.id}/traceability?today=${TODAY}`);
    expect(res.body.summary).toEqual({
      actionItemsByStatus: { OPEN: 1, IN_PROGRESS: 0, BLOCKED: 1, DONE: 1, CANCELLED: 0 },
      overdueCount: 1,
      openIssueCount: 1,
    });
  });

  it('is readable by any signed-in user', async () => {
    const { outsider, meeting } = await seed();
    const res = await (await agentFor(outsider)).get(`/api/meetings/${meeting.id}/traceability`);
    expect(res.status).toBe(200);
    expect(res.body.meeting.permissions.canEdit).toBe(false);
  });

  it('returns 404 for an unknown or deleted meeting and 401 when signed out', async () => {
    const { asOrganizer, meeting } = await seed();
    expect((await asOrganizer.get('/api/meetings/nope/traceability')).status).toBe(404);
    expect((await anonymous().get(`/api/meetings/${meeting.id}/traceability`)).status).toBe(401);
    await prisma.meeting.update({ where: { id: meeting.id }, data: { deletedAt: new Date() } });
    expect((await asOrganizer.get(`/api/meetings/${meeting.id}/traceability`)).status).toBe(404);
  });
});
