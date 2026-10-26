import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { PASSWORD, app, createUser, prisma, resetDb } from '../helpers/testApp';

const CSRF = { 'X-Requested-With': 'fetch' };

beforeEach(resetDb);

function cookieHeader(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  return (raw ?? []).join('; ');
}

describe('POST /api/auth/register', () => {
  it('creates the account, signs in, and sets an HttpOnly SameSite=Lax session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set(CSRF)
      .send({ name: 'Olivia', email: 'Olivia@Example.com', password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Olivia', email: 'olivia@example.com' });
    expect(res.body.passwordHash).toBeUndefined();
    const cookie = cookieHeader(res);
    expect(cookie).toContain('sid=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    const stored = await prisma.user.findUnique({ where: { email: 'olivia@example.com' } });
    expect(stored).not.toBeNull();
  });

  it('rejects an email that is already registered in any letter case', async () => {
    await createUser({ email: 'taken@example.com' });
    const res = await request(app)
      .post('/api/auth/register')
      .set(CSRF)
      .send({ name: 'X', email: 'TAKEN@example.com', password: PASSWORD });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it.each([
    ['empty name', { name: '', email: 'a@example.com', password: PASSWORD }],
    ['name over 100 chars', { name: 'x'.repeat(101), email: 'a@example.com', password: PASSWORD }],
    ['invalid email', { name: 'A', email: 'not-an-email', password: PASSWORD }],
    ['short password', { name: 'A', email: 'a@example.com', password: 'short' }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await request(app).post('/api/auth/register').set(CSRF).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with correct credentials', async () => {
    const user = await createUser({ email: 'arjun@example.com' });
    const res = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: 'ARJUN@example.com', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, email: 'arjun@example.com' });
    expect(cookieHeader(res)).toContain('sid=');
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    await createUser({ email: 'mei@example.com' });
    const wrong = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: 'mei@example.com', password: 'wrong-password' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: 'nobody@example.com', password: 'wrong-password' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknown.body).toEqual(wrong.body);
  });

  it('rate-limits the 11th attempt within a minute for the same email', async () => {
    const fresh = createApp(); // own limiter, so other tests do not interfere
    for (let i = 0; i < 10; i += 1) {
      const r = await request(fresh)
        .post('/api/auth/login')
        .set(CSRF)
        .send({ email: 'brute@example.com', password: 'wrong-password' });
      expect(r.status).toBe(401);
    }
    const blocked = await request(fresh)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: 'brute@example.com', password: 'wrong-password' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('refuses deactivated users', async () => {
    await createUser({ email: 'gone@example.com', deactivated: true });
    const res = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: 'gone@example.com', password: PASSWORD });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me and POST /api/auth/logout', () => {
  it('returns 401 without a session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns the current user with a session, and 401 after logout', async () => {
    const user = await createUser({ email: 'me@example.com' });
    const agent = request.agent(app);
    const login = await agent
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: user.email, password: PASSWORD });
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ id: user.id, name: user.name, email: user.email });

    const cookie = cookieHeader(login).split(';')[0]!;
    const logout = await agent.post('/api/auth/logout').set(CSRF);
    expect(logout.status).toBe(204);

    // The old cookie value no longer works, even if a client keeps sending it.
    const replay = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(replay.status).toBe(401);
  });
});

describe('CSRF guard', () => {
  it('rejects state-changing requests without X-Requested-With', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'a@example.com', password: PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
