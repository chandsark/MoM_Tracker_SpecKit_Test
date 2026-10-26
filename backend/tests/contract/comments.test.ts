import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, createItem, meetingScenario, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

describe('POST /api/action-items/:id/comments', () => {
  it('lets the organizer, assignee and registered participants comment', async () => {
    const { asOrganizer, meeting, assignee, participant, organizer } = await meetingScenario();
    const item = await createItem(asOrganizer, meeting.id, assignee.id);
    for (const [user, body] of [
      [organizer, 'From the organizer'],
      [assignee, 'From the assignee'],
      [participant, 'From a participant'],
    ] as const) {
      const res = await (
        await agentFor(user)
      ).post(`/api/action-items/${item.id}/comments`, { body });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        body,
        author: { id: user.id },
        createdAt: expect.any(String),
      });
    }
    const detail = await asOrganizer.get(`/api/action-items/${item.id}`);
    expect(detail.body.comments.map((c: { body: string }) => c.body)).toEqual([
      'From the organizer',
      'From the assignee',
      'From a participant',
    ]);
  });

  it('forbids signed-in users who are not part of the meeting', async () => {
    const { asOrganizer, meeting, assignee, outsider } = await meetingScenario();
    const item = await createItem(asOrganizer, meeting.id, assignee.id);
    const res = await (
      await agentFor(outsider)
    ).post(`/api/action-items/${item.id}/comments`, { body: 'Hi' });
    expect(res.status).toBe(403);
  });

  it.each([
    ['empty body', ''],
    ['whitespace body', '   '],
    ['body over 1000 chars', 'x'.repeat(1001)],
  ])('rejects %s with 400', async (_label, body) => {
    const { asOrganizer, meeting, assignee } = await meetingScenario();
    const item = await createItem(asOrganizer, meeting.id, assignee.id);
    const res = await asOrganizer.post(`/api/action-items/${item.id}/comments`, { body });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown action item', async () => {
    const { asOrganizer } = await meetingScenario();
    const res = await asOrganizer.post('/api/action-items/nope/comments', { body: 'Hi' });
    expect(res.status).toBe(404);
  });
});
