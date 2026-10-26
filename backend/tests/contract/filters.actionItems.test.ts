import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, createItem, meetingScenario, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

async function seed() {
  const s = await meetingScenario();
  const other = await s.asOrganizer.post('/api/meetings', {
    description: 'Other meeting',
    meetingDate: '2026-10-21',
    participants: [{ externalName: 'X' }],
  });
  const mk = (meetingId: string, assigneeId: string, description: string, dueDate: string) =>
    createItem(s.asOrganizer, meetingId, assigneeId, {
      description,
      startDate: '2026-09-01',
      dueDate,
    });
  const a = await mk(s.meeting.id, s.assignee.id, 'Alpha report', '2026-10-01'); // overdue
  const b = await mk(s.meeting.id, s.assignee.id, 'Beta deck', '2026-11-01');
  const c = await mk(s.meeting.id, s.participant.id, 'Gamma report', '2026-10-05'); // overdue
  const d = await mk(other.body.id, s.assignee.id, 'Delta notes', '2026-10-02');
  const asAssignee = await agentFor(s.assignee);
  await asAssignee.patch(`/api/action-items/${d.id}`, { version: 1, status: 'DONE' }); // past due but done
  await asAssignee.patch(`/api/action-items/${b.id}`, { version: 1, status: 'IN_PROGRESS' });
  return { ...s, asAssignee, otherMeetingId: other.body.id as string, ids: { a, b, c, d } };
}

const names = (res: { body: { items: { description: string }[] } }) =>
  res.body.items.map((i) => i.description);
const TODAY = 'today=2026-10-26';

describe('GET /api/action-items filters', () => {
  it('sorts by due date, earliest first', async () => {
    const { asOrganizer } = await seed();
    expect(names(await asOrganizer.get(`/api/action-items?${TODAY}`))).toEqual([
      'Alpha report',
      'Delta notes',
      'Gamma report',
      'Beta deck',
    ]);
  });

  it('filters by assignee id and by "me"', async () => {
    const { asOrganizer, asAssignee, participant } = await seed();
    expect(names(await asOrganizer.get(`/api/action-items?assigneeId=${participant.id}`))).toEqual([
      'Gamma report',
    ]);
    expect(names(await asAssignee.get('/api/action-items?assigneeId=me'))).toEqual([
      'Alpha report',
      'Delta notes',
      'Beta deck',
    ]);
  });

  it('filters by a comma-separated status list', async () => {
    const { asOrganizer } = await seed();
    expect(names(await asOrganizer.get('/api/action-items?status=IN_PROGRESS,DONE'))).toEqual([
      'Delta notes',
      'Beta deck',
    ]);
  });

  it('filters by meeting', async () => {
    const { asOrganizer, otherMeetingId } = await seed();
    expect(names(await asOrganizer.get(`/api/action-items?meetingId=${otherMeetingId}`))).toEqual([
      'Delta notes',
    ]);
  });

  it('filters by due date range', async () => {
    const { asOrganizer } = await seed();
    expect(
      names(await asOrganizer.get('/api/action-items?dueFrom=2026-10-02&dueTo=2026-10-31')),
    ).toEqual(['Delta notes', 'Gamma report']);
  });

  it('overdue=true returns past-due items that are not Done or Cancelled', async () => {
    const { asOrganizer } = await seed();
    const res = await asOrganizer.get(`/api/action-items?overdue=true&${TODAY}`);
    expect(names(res)).toEqual(['Alpha report', 'Gamma report']);
    expect(res.body.items.every((i: { isOverdue: boolean }) => i.isOverdue)).toBe(true);
  });

  it('filters by keyword', async () => {
    const { asOrganizer } = await seed();
    expect(names(await asOrganizer.get('/api/action-items?q=REPORT'))).toEqual([
      'Alpha report',
      'Gamma report',
    ]);
  });

  it('ANDs combined filters', async () => {
    const { asOrganizer, assignee } = await seed();
    const res = await asOrganizer.get(
      `/api/action-items?assigneeId=${assignee.id}&status=OPEN&overdue=true&${TODAY}`,
    );
    expect(names(res)).toEqual(['Alpha report']);
  });

  it('rejects pageSize over 200 and unknown statuses', async () => {
    const { asOrganizer } = await seed();
    expect((await asOrganizer.get('/api/action-items?pageSize=201')).status).toBe(400);
    expect((await asOrganizer.get('/api/action-items?status=WAITING')).status).toBe(400);
  });
});
