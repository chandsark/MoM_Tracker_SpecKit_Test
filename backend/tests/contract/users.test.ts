import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, anonymous, createUser, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

describe('GET /api/users', () => {
  it('returns active users matching the search, as UserRef objects', async () => {
    const me = await createUser({ name: 'Olivia Organizer' });
    await createUser({ name: 'Arjun Kumar', email: 'arjun.k@example.com' });
    await createUser({ name: 'Arjun Gone', deactivated: true });
    await createUser({ name: 'Mei Lin' });
    const client = await agentFor(me);

    const res = await client.get('/api/users?q=arjun');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toEqual({
      id: expect.any(String),
      name: 'Arjun Kumar',
      active: true,
    });
    expect(res.body.items[0].email).toBeUndefined();
  });

  it('matches on email as well as name', async () => {
    const me = await createUser();
    await createUser({ name: 'Someone', email: 'unique-handle@example.com' });
    const res = await (await agentFor(me)).get('/api/users?q=unique-handle');
    expect(res.body.items.map((u: { name: string }) => u.name)).toEqual(['Someone']);
  });

  it('paginates', async () => {
    const me = await createUser({ name: 'Paginator' });
    for (let i = 0; i < 5; i += 1) await createUser({ name: `Bulk ${i}` });
    const res = await (await agentFor(me)).get('/api/users?q=Bulk&pageSize=2&page=2');
    expect(res.body.total).toBe(5);
    expect(res.body.items).toHaveLength(2);
  });

  it('requires a session', async () => {
    const res = await anonymous().get('/api/users');
    expect(res.status).toBe(401);
  });
});
