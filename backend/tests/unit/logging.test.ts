// R14 / constitution: structured logs must never contain passwords, cookies, or meeting content.
import { Writable } from 'node:stream';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { resetDb } from '../helpers/testApp';

const CSRF = { 'X-Requested-With': 'fetch' };
const SECRETS = {
  password: 'Sup3r-Secret-Passw0rd',
  description: 'Confidential merger with Initech',
  itemDescription: 'Draft the confidential term sheet',
  comment: 'The board approved the price privately',
};

let log = '';
let cookie = '';

beforeAll(async () => {
  await resetDb();
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, done) {
      chunks.push(chunk.toString());
      done();
    },
  });
  const agent = request.agent(createApp({ logStream: stream, logLevel: 'info' }));

  const reg = await agent
    .post('/api/auth/register')
    .set(CSRF)
    .send({ name: 'Logger Test', email: 'logger@example.com', password: SECRETS.password });
  expect(reg.status).toBe(201);
  cookie = String(reg.headers['set-cookie']?.[0] ?? '')
    .split(';')[0]!
    .split('=')[1]!;
  const login = await agent
    .post('/api/auth/login')
    .set(CSRF)
    .send({ email: 'logger@example.com', password: SECRETS.password });
  expect(login.status).toBe(200);

  const meeting = await agent
    .post('/api/meetings')
    .set(CSRF)
    .send({
      description: SECRETS.description,
      meetingDate: '2026-10-20',
      participants: [{ externalName: 'Bob' }],
    });
  expect(meeting.status).toBe(201);
  const item = await agent.post(`/api/meetings/${meeting.body.id}/action-items`).set(CSRF).send({
    description: SECRETS.itemDescription,
    assigneeId: reg.body.id,
    startDate: '2026-10-20',
    dueDate: '2026-10-30',
  });
  expect(item.status).toBe(201);
  const comment = await agent
    .post(`/api/action-items/${item.body.id}/comments`)
    .set(CSRF)
    .send({ body: SECRETS.comment });
  expect(comment.status).toBe(201);
  await agent.get(`/api/meetings?q=${encodeURIComponent(SECRETS.description)}`);

  log = chunks.join('');
});

describe('request logging', () => {
  it('logs each request with route and status as JSON', () => {
    const entries = log
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l) as { req?: { url: string }; res?: { statusCode: number } });
    const urls = entries.map((e) => `${e.req?.url} ${e.res?.statusCode}`);
    expect(urls).toContain('/api/auth/register 201');
    expect(urls).toContain('/api/meetings 201');
    expect(urls.some((u) => /\/comments 201$/.test(u))).toBe(true);
  });

  it.each(Object.entries(SECRETS))('never contains the %s', (_name, secret) => {
    expect(log).not.toContain(secret);
    expect(log).not.toContain(encodeURIComponent(secret));
  });

  it('never contains the session cookie', () => {
    expect(cookie.length).toBeGreaterThan(10);
    expect(log).not.toContain(cookie);
    expect(log).not.toContain(decodeURIComponent(cookie));
  });
});
