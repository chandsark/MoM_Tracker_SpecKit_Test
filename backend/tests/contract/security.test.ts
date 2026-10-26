// Constitution V: authentication on every endpoint, safe headers, bounded bodies, secure cookies.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../../src/config';
import { app, resetDb } from '../helpers/testApp';

const CSRF = { 'X-Requested-With': 'fetch' };
const PUBLIC = new Set([
  'GET /health',
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/logout',
]);

/** Every "METHOD /path" in the OpenAPI contract, with path parameters filled in. */
function contractOperations(): string[] {
  const file = fileURLToPath(
    new URL('../../../specs/001-meeting-action-tracker/contracts/openapi.yaml', import.meta.url),
  );
  const ops: string[] = [];
  let path: string | null = null;
  let inPaths = false;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (/^paths:/.test(line)) inPaths = true;
    else if (/^\S/.test(line)) inPaths = false;
    if (!inPaths) continue;
    const p = /^ {2}(\/\S*):\s*$/.exec(line);
    if (p) path = p[1]!.replace(/\{entityType\}/g, 'meeting').replace(/\{[^}]+\}/g, 'x');
    const m = /^ {4}(get|post|patch|put|delete):/.exec(line);
    if (m && path) ops.push(`${m[1]!.toUpperCase()} ${path}`);
  }
  return ops;
}

describe('authentication on every contract endpoint', () => {
  const ops = contractOperations();

  it('found the documented operations', () => {
    expect(ops.length).toBeGreaterThan(25);
    expect(ops).toContain('GET /deleted');
    expect(ops).toContain('DELETE /meetings/x');
    expect(ops).toContain('GET /health');
  });

  it('GET /health is public and reports the API is up', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it.each(ops.filter((op) => !PUBLIC.has(op)))('%s returns 401 without a session', async (op) => {
    const [method, path] = op.split(' ') as [string, string];
    const verb = method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete';
    const agent = request(app);
    const res = await agent[verb](`/api${path}`)
      .set(CSRF)
      .send(method === 'GET' || method === 'DELETE' ? undefined : {});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('HTTP hardening', () => {
  it('sends helmet headers with a same-origin content security policy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects request bodies over 100 kB', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: 'a@example.com', password: 'x'.repeat(110 * 1024) });
    expect(res.status).toBe(413);
    expect(JSON.stringify(res.body)).not.toContain(' at ');
  });

  it('rejects state-changing requests without the CSRF header', async () => {
    const res = await request(app).post('/api/meetings').send({});
    expect(res.status).toBe(403);
  });
});

describe('session cookie', () => {
  const original = config.NODE_ENV;
  afterEach(() => {
    config.NODE_ENV = original;
  });

  it('is HttpOnly and SameSite=Lax, and Secure in production', async () => {
    await resetDb();
    const register = (email: string) =>
      request(app)
        .post('/api/auth/register')
        .set(CSRF)
        .send({ name: 'Cookie', email, password: 'Password123!' });

    const dev = String((await register('cookie-dev@example.com')).headers['set-cookie']);
    expect(dev).toMatch(/HttpOnly/);
    expect(dev).toMatch(/SameSite=Lax/);
    expect(dev).not.toMatch(/Secure/);

    config.NODE_ENV = 'production';
    const prod = String((await register('cookie-prod@example.com')).headers['set-cookie']);
    expect(prod).toMatch(/Secure/);
  });
});
