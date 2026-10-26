import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/db';

export const PASSWORD = 'Password123!';
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);
const CSRF = { 'X-Requested-With': 'fetch' };

export const app = createApp();
export { prisma };

export async function resetDb(): Promise<void> {
  await prisma.$transaction([
    prisma.changeHistory.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.issue.deleteMany(),
    prisma.actionItem.deleteMany(),
    prisma.meetingParticipant.deleteMany(),
    prisma.meeting.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

let counter = 0;

export interface TestUser {
  id: string;
  name: string;
  email: string;
}

export async function createUser(
  opts: { name?: string; email?: string; deactivated?: boolean } = {},
): Promise<TestUser> {
  counter += 1;
  const user = await prisma.user.create({
    data: {
      name: opts.name ?? `User ${counter}`,
      email: (opts.email ?? `user${counter}-${Date.now()}@example.com`).toLowerCase(),
      passwordHash: PASSWORD_HASH,
      deactivatedAt: opts.deactivated ? new Date() : null,
    },
  });
  return { id: user.id, name: user.name, email: user.email };
}

/** A signed-in client that sends the CSRF header on every state-changing request. */
export interface Client {
  get(url: string): request.Test;
  post(url: string, body?: object): request.Test;
  patch(url: string, body?: object): request.Test;
  delete(url: string): request.Test;
}

export function clientFor(agent: ReturnType<typeof request.agent>): Client {
  return {
    get: (url) => agent.get(url),
    post: (url, body) =>
      agent
        .post(url)
        .set(CSRF)
        .send(body ?? {}),
    patch: (url, body) =>
      agent
        .patch(url)
        .set(CSRF)
        .send(body ?? {}),
    delete: (url) => agent.delete(url).set(CSRF),
  };
}

export async function agentFor(user: TestUser): Promise<Client> {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/login')
    .set(CSRF)
    .send({ email: user.email, password: PASSWORD });
  if (res.status !== 200) {
    throw new Error(`login failed for ${user.email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return clientFor(agent);
}

export function anonymous(): Client {
  return clientFor(request.agent(app));
}

/** Organizer, assignee, registered participant, and an unrelated user, plus a meeting. */
export async function meetingScenario() {
  const organizer = await createUser({ name: 'Olivia' });
  const assignee = await createUser({ name: 'Arjun' });
  const participant = await createUser({ name: 'Mei' });
  const outsider = await createUser({ name: 'Sam' });
  const asOrganizer = await agentFor(organizer);
  const meetingRes = await asOrganizer.post('/api/meetings', {
    description: 'Weekly sync',
    meetingDate: '2026-10-20',
    participants: [{ userId: assignee.id }, { userId: participant.id }, { externalName: 'Vendor' }],
  });
  if (meetingRes.status !== 201) throw new Error(`meeting create failed: ${meetingRes.status}`);
  return {
    organizer,
    assignee,
    participant,
    outsider,
    asOrganizer,
    meeting: meetingRes.body as { id: string; version: number },
  };
}

export async function createItem(
  client: Client,
  meetingId: string,
  assigneeId: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await client.post(`/api/meetings/${meetingId}/action-items`, {
    description: 'Prepare report',
    assigneeId,
    startDate: '2026-10-20',
    dueDate: '2026-10-30',
    ...overrides,
  });
  if (res.status !== 201) {
    throw new Error(`action item create failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body as { id: string; version: number; status: string };
}

export async function createIssue(
  client: Client,
  actionItemId: string,
  overrides: Record<string, unknown> = {},
) {
  const res = await client.post(`/api/action-items/${actionItemId}/issues`, {
    title: 'Blocked on data',
    description: 'Waiting for the export',
    severity: 'HIGH',
    ...overrides,
  });
  if (res.status !== 201) {
    throw new Error(`issue create failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body as { id: string; version: number; status: string };
}
