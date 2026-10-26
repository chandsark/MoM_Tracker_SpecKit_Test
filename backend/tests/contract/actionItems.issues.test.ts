import { beforeEach, describe, expect, it } from 'vitest';
import { agentFor, createIssue, createItem, meetingScenario, resetDb } from '../helpers/testApp';

beforeEach(resetDb);

async function setup() {
  const s = await meetingScenario();
  const item = await createItem(s.asOrganizer, s.meeting.id, s.assignee.id);
  return { ...s, item, asAssignee: await agentFor(s.assignee) };
}

describe('open issues on action items', () => {
  it('counts only non-resolved issues in detail and list views', async () => {
    const { item, asAssignee, meeting } = await setup();
    const a = await createIssue(asAssignee, item.id);
    await createIssue(asAssignee, item.id);
    await asAssignee.patch(`/api/issues/${a.id}`, { version: 1, status: 'RESOLVED' });

    const detail = await asAssignee.get(`/api/action-items/${item.id}`);
    expect(detail.body.openIssueCount).toBe(1);
    expect(detail.body.issues).toHaveLength(2);
    const list = await asAssignee.get(`/api/action-items?meetingId=${meeting.id}`);
    expect(list.body.items[0].openIssueCount).toBe(1);
  });

  it('requires confirmation to mark DONE while issues are open', async () => {
    const { item, asAssignee } = await setup();
    await createIssue(asAssignee, item.id);
    const blocked = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      status: 'DONE',
    });
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('OPEN_ISSUES_CONFIRMATION_REQUIRED');
    expect(blocked.body.error.details.openIssueCount).toBe(1);

    const confirmed = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      status: 'DONE',
      confirmOpenIssues: true,
    });
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.status).toBe('DONE');
  });

  it('does not require confirmation when every issue is resolved', async () => {
    const { item, asAssignee } = await setup();
    const issue = await createIssue(asAssignee, item.id);
    await asAssignee.patch(`/api/issues/${issue.id}`, { version: 1, status: 'RESOLVED' });
    const res = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      status: 'DONE',
    });
    expect(res.status).toBe(200);
  });

  it('never changes BLOCKED automatically when issues are resolved', async () => {
    const { item, asAssignee } = await setup();
    const issue = await createIssue(asAssignee, item.id);
    const blocked = await asAssignee.patch(`/api/action-items/${item.id}`, {
      version: 1,
      status: 'BLOCKED',
    });
    expect(blocked.status).toBe(200);
    await asAssignee.patch(`/api/issues/${issue.id}`, { version: 1, status: 'RESOLVED' });
    const after = await asAssignee.get(`/api/action-items/${item.id}`);
    expect(after.body.status).toBe('BLOCKED');
    expect(after.body.openIssueCount).toBe(0);
  });
});
