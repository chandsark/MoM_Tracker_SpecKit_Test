import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, createUser, resetDb, type Client } from '../helpers/testApp';

beforeEach(resetDb);

async function seed() {
  const me = await createUser({ name: 'Olivia' });
  const arjun = await createUser({ name: 'Arjun' });
  const client = await agentFor(me);
  const make = (description: string, meetingDate: string, participants: object[]) =>
    client.post('/api/meetings', { description, meetingDate, participants });
  await make('Budget review', '2026-01-10', [{ userId: arjun.id }]);
  await make('Sprint planning', '2026-02-10', [{ externalName: 'Vendor' }]);
  await make('BUDGET follow-up', '2026-03-10', [{ userId: arjun.id }]);
  return { client, arjun };
}

const descriptions = (res: { body: { items: { description: string }[] } }) =>
  res.body.items.map((m) => m.description);

describe('GET /api/meetings filters', () => {
  let client: Client;
  let arjunId: string;
  beforeEach(async () => {
    const s = await seed();
    client = s.client;
    arjunId = s.arjun.id;
  });

  it('filters by an inclusive date range', async () => {
    const res = await client.get('/api/meetings?from=2026-02-10&to=2026-03-10');
    expect(descriptions(res)).toEqual(['BUDGET follow-up', 'Sprint planning']);
    expect(res.body.total).toBe(2);
  });

  it('filters by participant', async () => {
    const res = await client.get(`/api/meetings?participantId=${arjunId}`);
    expect(descriptions(res)).toEqual(['BUDGET follow-up', 'Budget review']);
  });

  it('filters by a case-insensitive keyword', async () => {
    const res = await client.get('/api/meetings?q=budget');
    expect(descriptions(res)).toEqual(['BUDGET follow-up', 'Budget review']);
  });

  it('combines filters', async () => {
    const res = await client.get(`/api/meetings?q=budget&from=2026-02-01&participantId=${arjunId}`);
    expect(descriptions(res)).toEqual(['BUDGET follow-up']);
  });

  it('paginates with an accurate total', async () => {
    const res = await client.get('/api/meetings?pageSize=1&page=2');
    expect(res.body.total).toBe(3);
    expect(descriptions(res)).toEqual(['Sprint planning']);
  });

  it('rejects from > to with 400', async () => {
    const res = await client.get('/api/meetings?from=2026-03-01&to=2026-02-01');
    expect(res.status).toBe(400);
  });
});
