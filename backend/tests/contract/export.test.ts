import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, createIssue, createItem, meetingScenario, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

const ITEM_HEADERS =
  'Action Item ID,Description,Assignee,Start Date,Due Date,Status,Overdue,Open Issues,Meeting ID,Meeting Date,Meeting Description,Last Updated';
const ISSUE_HEADERS =
  'Issue ID,Title,Description,Severity,Status,Raised By,Raised On,Action Item ID,Action Item,Action Item Assignee,Meeting ID,Meeting Date,Meeting Description';

function rows(text: string): string[] {
  return (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split('\r\n').filter(Boolean);
}

async function seed() {
  const s = await meetingScenario();
  const asAssignee = await agentFor(s.assignee);
  const items = [];
  for (let i = 0; i < 5; i += 1) {
    items.push(
      await createItem(s.asOrganizer, s.meeting.id, s.assignee.id, {
        description: i === 0 ? '=HYPERLINK("http://evil")' : `Item, number ${i}`,
        startDate: '2026-09-01',
        dueDate: `2026-10-0${i + 1}`,
      }),
    );
  }
  await createIssue(asAssignee, items[0]!.id, { title: 'Problem "one"', severity: 'CRITICAL' });
  await createIssue(asAssignee, items[1]!.id, { title: 'Problem two', severity: 'LOW' });
  return { ...s, asAssignee, items };
}

describe('GET /api/action-items/export.csv', () => {
  it('returns a CSV download with the documented columns', async () => {
    const { asOrganizer } = await seed();
    const res = await asOrganizer.get('/api/action-items/export.csv?today=2026-10-26');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="action-items-\d{8}\.csv"$/,
    );
    expect(res.text.startsWith('﻿')).toBe(true);
    const lines = rows(res.text);
    expect(lines[0]).toBe(ITEM_HEADERS);
    expect(lines).toHaveLength(6);
    expect(lines[1]).toContain(`'=HYPERLINK`); // formula guard
    expect(lines[1]).toContain(',Yes,1,'); // overdue, open issues
    expect(lines[2]).toContain('"Item, number 1"');
    expect(lines[1]).toContain(',Weekly sync,');
  });

  it('matches the list endpoint for the same filters and ignores pagination', async () => {
    const { asOrganizer, assignee } = await seed();
    const query = `assigneeId=${assignee.id}&dueTo=2026-10-03&pageSize=1`;
    const list = await asOrganizer.get(`/api/action-items?${query}`);
    const csv = await asOrganizer.get(`/api/action-items/export.csv?${query}`);
    expect(rows(csv.text)).toHaveLength(list.body.total + 1);
    const csvIds = rows(csv.text)
      .slice(1)
      .map((l) => l.split(',')[0]);
    const all = await asOrganizer.get(
      `/api/action-items?assigneeId=${assignee.id}&dueTo=2026-10-03`,
    );
    expect(csvIds).toEqual(all.body.items.map((i: { id: string }) => i.id));
  });
});

describe('GET /api/issues/export.csv', () => {
  it('returns issues with their action item and meeting columns', async () => {
    const { asOrganizer } = await seed();
    const res = await asOrganizer.get('/api/issues/export.csv?status=OPEN');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(
      /^attachment; filename="issues-\d{8}\.csv"$/,
    );
    const lines = rows(res.text);
    expect(lines[0]).toBe(ISSUE_HEADERS);
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"Problem ""one"""');
    expect(lines[1]).toContain(',Critical,Open,Arjun,');
    expect(lines[1]).toContain(',Weekly sync');
    expect(lines[2]).toContain(',Low,');
  });

  it('writes only the header row when nothing matches', async () => {
    const { asOrganizer } = await seed();
    const res = await asOrganizer.get('/api/issues/export.csv?status=RESOLVED');
    expect(rows(res.text)).toEqual([ISSUE_HEADERS]);
  });
});
