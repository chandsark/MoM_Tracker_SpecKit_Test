import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, createIssue, createItem, meetingScenario, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

async function seed() {
  const s = await meetingScenario();
  const asAssignee = await agentFor(s.assignee);
  const asParticipant = await agentFor(s.participant);
  const itemA = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
    description: 'Item A',
  });
  const itemB = await createItem(s.asOrganizer, s.meeting.id, s.participant.id, {
    description: 'Item B',
  });
  const low = await createIssue(asAssignee, itemA.id, { title: 'Low one', severity: 'LOW' });
  await createIssue(asAssignee, itemA.id, { title: 'Critical one', severity: 'CRITICAL' });
  await createIssue(asParticipant, itemB.id, { title: 'High one', severity: 'HIGH' });
  await asAssignee.patch(`/api/issues/${low.id}`, { version: 1, status: 'RESOLVED' });
  return { ...s, asAssignee, asParticipant, itemA, itemB };
}

const titles = (res: { body: { items: { title: string }[] } }) =>
  res.body.items.map((i) => i.title);

describe('GET /api/issues', () => {
  it('sorts by severity (critical first), then newest', async () => {
    const { asOrganizer } = await seed();
    const res = await asOrganizer.get('/api/issues');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(titles(res)).toEqual(['Critical one', 'High one', 'Low one']);
    expect(res.body.items[0]).toMatchObject({
      actionItem: { description: 'Item A' },
      meeting: { description: 'Weekly sync' },
    });
  });

  it('filters by status and severity lists', async () => {
    const { asOrganizer } = await seed();
    expect(titles(await asOrganizer.get('/api/issues?status=OPEN,IN_PROGRESS'))).toEqual([
      'Critical one',
      'High one',
    ]);
    expect(titles(await asOrganizer.get('/api/issues?severity=LOW,HIGH'))).toEqual([
      'High one',
      'Low one',
    ]);
  });

  it('filters by the assignee of the parent action item, including "me"', async () => {
    const { asOrganizer, asParticipant, assignee } = await seed();
    expect(titles(await asOrganizer.get(`/api/issues?assigneeId=${assignee.id}`))).toEqual([
      'Critical one',
      'Low one',
    ]);
    expect(titles(await asParticipant.get('/api/issues?assigneeId=me'))).toEqual(['High one']);
  });

  it('filters by action item and combines filters', async () => {
    const { asOrganizer, itemA } = await seed();
    expect(
      titles(await asOrganizer.get(`/api/issues?actionItemId=${itemA.id}&status=OPEN`)),
    ).toEqual(['Critical one']);
  });

  it('rejects unknown severities', async () => {
    const { asOrganizer } = await seed();
    expect((await asOrganizer.get('/api/issues?severity=URGENT')).status).toBe(400);
  });
});
