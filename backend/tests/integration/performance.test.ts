// SC-004: filtered results and exports in under 2 seconds with 10,000 action items.
import { beforeAll, describe, expect, it } from 'vitest';
import { agentFor, createUser, prisma, resetDb, type Client } from '../helpers/testApp';

const ITEM_COUNT = 10_000;
const LIMIT_MS = 2_000;
const STATUSES = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'];

let client: Client;
let assigneeId: string;

beforeAll(async () => {
  await resetDb();
  const organizer = await createUser({ name: 'Perf Organizer' });
  const assignees = [await createUser({ name: 'Perf A' }), await createUser({ name: 'Perf B' })];
  assigneeId = assignees[0]!.id;
  const meetingIds: string[] = [];
  for (let i = 0; i < 200; i += 1) {
    const m = await prisma.meeting.create({
      data: {
        description: `Perf meeting ${i}`,
        meetingDate: '2026-10-01',
        organizerId: organizer.id,
      },
    });
    meetingIds.push(m.id);
  }
  for (let start = 0; start < ITEM_COUNT; start += 1000) {
    await prisma.actionItem.createMany({
      data: Array.from({ length: 1000 }, (_, k) => {
        const i = start + k;
        const day = String((i % 28) + 1).padStart(2, '0');
        return {
          meetingId: meetingIds[i % meetingIds.length]!,
          description: `Perf item ${i}`,
          assigneeId: assignees[i % 2]!.id,
          createdById: organizer.id,
          startDate: '2026-09-01',
          dueDate: `2026-${i % 2 ? '10' : '11'}-${day}`,
          status: STATUSES[i % STATUSES.length]!,
        };
      }),
    });
  }
  client = await agentFor(organizer);
}, 120_000);

async function timed(url: string) {
  const started = performance.now();
  const res = await client.get(url);
  return { res, ms: performance.now() - started };
}

describe('performance with 10,000 action items', () => {
  it('has the data in place', async () => {
    expect(await prisma.actionItem.count()).toBe(ITEM_COUNT);
  });

  it.each([
    '/api/action-items?today=2026-10-26',
    '/api/action-items?status=OPEN,BLOCKED&overdue=true&today=2026-10-26',
    '/api/action-items?q=item%2099&dueFrom=2026-10-01&dueTo=2026-10-31',
    '/api/meetings?q=Perf',
  ])('lists %s in under 2 s', async (url) => {
    const { res, ms } = await timed(url);
    expect(res.status).toBe(200);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('filters by assignee in under 2 s', async () => {
    const { res, ms } = await timed(`/api/action-items?assigneeId=${assigneeId}&status=OPEN`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(ms).toBeLessThan(LIMIT_MS);
  });

  it('exports all 10,000 items as CSV in under 2 s', async () => {
    const { res, ms } = await timed('/api/action-items/export.csv?today=2026-10-26');
    expect(res.status).toBe(200);
    expect(res.text.split('\r\n').filter(Boolean)).toHaveLength(ITEM_COUNT + 1);
    expect(ms).toBeLessThan(LIMIT_MS);
  });
});
