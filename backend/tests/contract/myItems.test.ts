import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, createItem, meetingScenario, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

describe('GET /api/action-items?assigneeId=me', () => {
  it("returns only the caller's open items, earliest due first, with overdue from `today`", async () => {
    const { asOrganizer, meeting, assignee, participant } = await meetingScenario();
    const late = await createItem(asOrganizer, meeting.id, assignee.id, {
      description: 'Late',
      startDate: '2026-10-01',
      dueDate: '2026-10-10',
    });
    await createItem(asOrganizer, meeting.id, assignee.id, {
      description: 'Upcoming',
      startDate: '2026-10-01',
      dueDate: '2026-11-10',
    });
    const done = await createItem(asOrganizer, meeting.id, assignee.id, {
      description: 'Finished',
      startDate: '2026-10-01',
      dueDate: '2026-10-05',
    });
    await createItem(asOrganizer, meeting.id, participant.id, { description: 'Not mine' });

    const asAssignee = await agentFor(assignee);
    await asAssignee.patch(`/api/action-items/${done.id}`, { version: 1, status: 'DONE' });

    const res = await asAssignee.get(
      '/api/action-items?assigneeId=me&status=OPEN,IN_PROGRESS,BLOCKED&today=2026-10-26',
    );
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { description: string }) => i.description)).toEqual([
      'Late',
      'Upcoming',
    ]);
    expect(res.body.items[0]).toMatchObject({ id: late.id, isOverdue: true });
    expect(res.body.items[1].isOverdue).toBe(false);
  });
});
