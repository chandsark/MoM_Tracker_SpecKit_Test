import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, createUser, meetingScenario, prisma, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

const validItem = (assigneeId: string) => ({
  description: 'Prepare the quarterly report',
  assigneeId,
  startDate: '2026-10-20',
  dueDate: '2026-10-30',
});

describe('POST /api/meetings/:id/action-items', () => {
  it('lets the organizer create an item, defaulting to OPEN, linked to the meeting', async () => {
    const { asOrganizer, meeting, assignee } = await meetingScenario();
    const res = await asOrganizer.post(
      `/api/meetings/${meeting.id}/action-items`,
      validItem(assignee.id),
    );
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      description: 'Prepare the quarterly report',
      assignee: { id: assignee.id, name: 'Arjun', active: true },
      startDate: '2026-10-20',
      dueDate: '2026-10-30',
      status: 'OPEN',
      version: 1,
      meeting: { id: meeting.id, description: 'Weekly sync', meetingDate: '2026-10-20' },
      openIssueCount: 0,
      needsReassignment: false,
    });
    const history = await prisma.changeHistory.findMany({ where: { entityId: res.body.id } });
    expect(history).toEqual([
      expect.objectContaining({ entityType: 'ACTION_ITEM', action: 'CREATE' }),
    ]);
  });

  it('forbids non-organizers', async () => {
    const { meeting, assignee, participant } = await meetingScenario();
    for (const user of [assignee, participant]) {
      const res = await (
        await agentFor(user)
      ).post(`/api/meetings/${meeting.id}/action-items`, validItem(assignee.id));
      expect(res.status).toBe(403);
    }
  });

  it.each([
    ['blank description', { description: '  ' }],
    ['description over 2000 chars', { description: 'x'.repeat(2001) }],
    ['invalid start date', { startDate: '2026-13-01' }],
    ['missing due date', { dueDate: undefined }],
    ['unknown status', { status: 'WAITING' }],
  ])('rejects %s with 400', async (_label, override) => {
    const { asOrganizer, meeting, assignee } = await meetingScenario();
    const res = await asOrganizer.post(`/api/meetings/${meeting.id}/action-items`, {
      ...validItem(assignee.id),
      ...override,
    });
    expect(res.status).toBe(400);
  });

  it('rejects a due date before the start date, reporting it on dueDate', async () => {
    const { asOrganizer, meeting, assignee } = await meetingScenario();
    const res = await asOrganizer.post(`/api/meetings/${meeting.id}/action-items`, {
      ...validItem(assignee.id),
      startDate: '2026-10-20',
      dueDate: '2026-10-19',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details.fields.dueDate).toBeDefined();
  });

  it('allows the due date to equal the start date', async () => {
    const { asOrganizer, meeting, assignee } = await meetingScenario();
    const res = await asOrganizer.post(`/api/meetings/${meeting.id}/action-items`, {
      ...validItem(assignee.id),
      startDate: '2026-10-20',
      dueDate: '2026-10-20',
    });
    expect(res.status).toBe(201);
  });

  it('requires the assignee to be an active registered user', async () => {
    const { asOrganizer, meeting } = await meetingScenario();
    const gone = await createUser({ deactivated: true });
    for (const assigneeId of [gone.id, 'unknown-user']) {
      const res = await asOrganizer.post(
        `/api/meetings/${meeting.id}/action-items`,
        validItem(assigneeId),
      );
      expect(res.status).toBe(400);
      expect(res.body.error.details.fields.assigneeId).toBeDefined();
    }
  });

  it('returns 404 when the meeting does not exist', async () => {
    const user = await createUser();
    const res = await (
      await agentFor(user)
    ).post('/api/meetings/nope/action-items', validItem(user.id));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/action-items?meetingId=', () => {
  it("lists only that meeting's items, earliest due date first", async () => {
    const { asOrganizer, meeting, assignee } = await meetingScenario();
    const other = await asOrganizer.post('/api/meetings', {
      description: 'Other',
      meetingDate: '2026-10-21',
      participants: [{ externalName: 'X' }],
    });
    await asOrganizer.post(`/api/meetings/${meeting.id}/action-items`, {
      ...validItem(assignee.id),
      description: 'Later',
      dueDate: '2026-11-05',
    });
    await asOrganizer.post(`/api/meetings/${meeting.id}/action-items`, {
      ...validItem(assignee.id),
      description: 'Sooner',
      dueDate: '2026-10-25',
    });
    await asOrganizer.post(`/api/meetings/${other.body.id}/action-items`, validItem(assignee.id));
    const res = await asOrganizer.get(`/api/action-items?meetingId=${meeting.id}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items.map((i: { description: string }) => i.description)).toEqual([
      'Sooner',
      'Later',
    ]);
  });
});

describe('GET /api/action-items/:id', () => {
  it('returns the meeting ref, overdue flag, open issue count, permissions and comments', async () => {
    const { asOrganizer, meeting, assignee } = await meetingScenario();
    const created = await asOrganizer.post(`/api/meetings/${meeting.id}/action-items`, {
      ...validItem(assignee.id),
      startDate: '2026-10-01',
      dueDate: '2026-10-10',
    });
    const asAssignee = await agentFor(assignee);
    const res = await asAssignee.get(`/api/action-items/${created.body.id}?today=2026-10-26`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      meeting: { id: meeting.id },
      isOverdue: true,
      openIssueCount: 0,
      comments: [],
      issues: [],
      permissions: {
        canEdit: true,
        canReassign: false,
        canComment: true,
        canRaiseIssue: true,
        canDelete: false,
      },
    });
    const notYet = await asAssignee.get(`/api/action-items/${created.body.id}?today=2026-10-05`);
    expect(notYet.body.isOverdue).toBe(false);
  });

  it('returns 404 for an unknown item', async () => {
    const res = await (await agentFor(await createUser())).get('/api/action-items/nope');
    expect(res.status).toBe(404);
  });
});
