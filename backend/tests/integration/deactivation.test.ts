// Spec edge case "a participant or assignee is removed from the system": the user can no longer
// sign in, their history stays visible by name, and their open items need reassignment.
import { beforeEach, describe, expect, it } from 'vitest';
import { deactivateUser } from '../../src/users/deactivate';
import {
  agentFor,
  anonymous,
  createItem,
  meetingScenario,
  PASSWORD,
  prisma,
  resetDb,
} from '../helpers/testApp';

beforeEach(resetDb);

async function seed() {
  const s = await meetingScenario();
  const asAssignee = await agentFor(s.assignee);
  const open = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
    description: 'Open item',
  });
  const done = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
    description: 'Done item',
  });
  const update = await asAssignee.patch(`/api/action-items/${open.id}`, {
    version: open.version,
    status: 'IN_PROGRESS',
  });
  expect(update.status).toBe(200);
  await asAssignee.patch(`/api/action-items/${done.id}`, { version: done.version, status: 'DONE' });
  return { ...s, asAssignee, open, done };
}

describe('deactivateUser', () => {
  it('blocks sign-in and ends existing sessions', async () => {
    const s = await seed();
    await deactivateUser(s.assignee.email.toUpperCase());

    expect(await prisma.session.count({ where: { userId: s.assignee.id } })).toBe(0);
    expect((await s.asAssignee.get('/api/auth/me')).status).toBe(401);
    const login = await anonymous().post('/api/auth/login', {
      email: s.assignee.email,
      password: PASSWORD,
    });
    expect(login.status).toBe(401);
  });

  it('keeps their name in history and flags only their open items for reassignment', async () => {
    const s = await seed();
    await deactivateUser(s.assignee.email);

    const history = await s.asOrganizer.get(`/api/history/action-item/${s.open.id}`);
    const statusChange = (
      history.body as { field: string | null; actor: { name: string; active: boolean } }[]
    ).find((e) => e.field === 'status');
    expect(statusChange?.actor).toMatchObject({ name: 'Arjun', active: false });

    const open = await s.asOrganizer.get(`/api/action-items/${s.open.id}`);
    expect(open.body.needsReassignment).toBe(true);
    const done = await s.asOrganizer.get(`/api/action-items/${s.done.id}`);
    expect(done.body.needsReassignment).toBe(false);
  });

  it('leaves an already deactivated user unchanged and rejects unknown emails', async () => {
    const s = await seed();
    const first = await deactivateUser(s.assignee.email);
    const second = await deactivateUser(s.assignee.email);
    expect(second.deactivatedAt).toEqual(first.deactivatedAt);
    await expect(deactivateUser('nobody@example.com')).rejects.toThrow(
      'No user with email nobody@example.com',
    );
  });
});
